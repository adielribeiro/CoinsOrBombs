import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createGame } from './game/createGame.js';

const createUtilityInventory = () => ({
  lifePotion: 0,
  revealBomb: 0,
  safePath: 0
});

const initialState = {
  cave: 1,
  hp: 2,
  maxHp: 2,
  coins: 0,
  bombs: 0,
  pickaxeLevel: 1,
  pickaxePower: 1,
  doubleBreakChance: 0,
  bagBonus: 0,
  coinLuck: 0,
  utilities: createUtilityInventory(),
  inLobby: false,
  lobbyReason: null,
  nextCaveAvailable: null,
  outcomeCave: null,
  lastMessage: 'Clique em uma rocha na borda da área aberta para começar.'
};

const upgradeCatalog = [
  {
    id: 'pickaxe_2',
    name: 'Picareta Melhorada II',
    description: 'Reduz a quantidade de cliques para quebrar rochas.',
    cost: 10,
    apply: (state) => ({ ...state, pickaxeLevel: 2, pickaxePower: 2 })
  },
  {
    id: 'pickaxe_3',
    name: 'Picareta Melhorada III',
    description: 'Mais poder e 22% de chance de quebrar uma segunda rocha ao abrir uma.',
    cost: 30,
    apply: (state) => ({
      ...state,
      pickaxeLevel: 3,
      pickaxePower: 3,
      doubleBreakChance: 0.22
    })
  },
  {
    id: 'bag_1',
    name: 'Bolsa Maior I',
    description: '+1 moeda para cada moeda encontrada.',
    cost: 15,
    apply: (state) => ({ ...state, bagBonus: 1 })
  },
  {
    id: 'bag_2',
    name: 'Bolsa Maior II',
    description: 'Aumenta o bônus total para +2 moedas por coleta.',
    cost: 35,
    apply: (state) => ({ ...state, bagBonus: 2 })
  },
  {
    id: 'prospector_1',
    name: 'Instinto de Garimpo',
    description: 'Aumenta a chance de encontrar moedas escondidas nas rochas.',
    cost: 40,
    apply: (state) => ({ ...state, coinLuck: 0.08 })
  },
  {
    id: 'life_1',
    name: 'Resistência I',
    description: 'Aumenta sua vida máxima para 3.',
    cost: 20,
    apply: (state) => ({ ...state, maxHp: 3, hp: Math.max(state.hp, 3) })
  },
  {
    id: 'life_2',
    name: 'Resistência II',
    description: 'Aumenta sua vida máxima para 4.',
    cost: 45,
    apply: (state) => ({ ...state, maxHp: 4, hp: Math.max(state.hp, 4) })
  }
];

const utilityCatalog = [
  {
    id: 'lifePotion',
    icon: '❤',
    name: 'Poção de Vida',
    description: 'Recupera 1 ponto de vida durante a run.',
    cost: 20
  },
  {
    id: 'revealBomb',
    icon: '💣',
    name: 'Poção Dedo-Duro',
    description: 'Revela uma bomba escondida no mapa atual.',
    cost: 50
  },
  {
    id: 'safePath',
    icon: '🧭',
    name: 'Poção Caminho Seguro',
    description: 'Mostra a rota segura até a saída da cave atual.',
    cost: 100
  }
];

export default function App() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef(initialState);
  const purchasedRef = useRef([]);
  const [gameState, setGameState] = useState(initialState);
  const [purchased, setPurchased] = useState([]);
  const [selectedUtility, setSelectedUtility] = useState(null);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    purchasedRef.current = purchased;
  }, [purchased]);

  useEffect(() => {
    if (gameState.inLobby) {
      setSelectedUtility(null);
      return;
    }

    if (selectedUtility && (gameState.utilities?.[selectedUtility] ?? 0) <= 0) {
      setSelectedUtility(null);
    }
  }, [gameState.inLobby, gameState.utilities, selectedUtility]);

  useEffect(() => {
    const handleState = (event) => {
      setGameState((prev) => ({ ...prev, ...event.detail }));
    };

    const handleSync = (event) => {
      setGameState(event.detail.state);
      setPurchased(event.detail.purchased);
    };

    window.addEventListener('cob-state', handleState);
    window.addEventListener('cob-sync-ui', handleSync);

    if (!gameRef.current && containerRef.current) {
      gameRef.current = createGame(containerRef.current, {
        getPersistentState: () => ({ ...stateRef.current, purchased: purchasedRef.current }),
        syncUI: (payload) => {
          window.dispatchEvent(new CustomEvent('cob-sync-ui', { detail: payload }));
        }
      });
    }

    return () => {
      window.removeEventListener('cob-state', handleState);
      window.removeEventListener('cob-sync-ui', handleSync);

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const availableUpgrades = useMemo(
    () => upgradeCatalog.filter((upgrade) => !purchased.includes(upgrade.id)),
    [purchased]
  );

  const buyUpgrade = (upgrade) => {
    if (gameState.coins < upgrade.cost) return;

    const nextState = upgrade.apply({ ...gameState, coins: gameState.coins - upgrade.cost });
    const nextPurchased = [...purchased, upgrade.id];
    const syncedState = {
      ...nextState,
      inLobby: true,
      lastMessage: `${upgrade.name} comprada com sucesso.`
    };

    setPurchased(nextPurchased);
    setGameState(syncedState);

    window.dispatchEvent(
      new CustomEvent('cob-buy-upgrade', {
        detail: {
          state: syncedState,
          purchased: nextPurchased
        }
      })
    );
  };

  const buyUtility = (utility) => {
    if (gameState.coins < utility.cost) return;

    const nextState = {
      ...gameState,
      coins: gameState.coins - utility.cost,
      utilities: {
        ...createUtilityInventory(),
        ...gameState.utilities,
        [utility.id]: (gameState.utilities?.[utility.id] ?? 0) + 1
      },
      inLobby: true,
      lastMessage: `${utility.name} adicionada à mochila da run.`
    };

    setGameState(nextState);

    window.dispatchEvent(
      new CustomEvent('cob-buy-utility', {
        detail: {
          state: nextState,
          purchased
        }
      })
    );
  };

  const restartRun = () => {
    const restarted = {
      ...gameState,
      cave: 1,
      bombs: 0,
      hp: gameState.maxHp,
      utilities: createUtilityInventory(),
      inLobby: false,
      lobbyReason: null,
      nextCaveAvailable: null,
      outcomeCave: null,
      lastMessage: 'Run reiniciada manualmente.'
    };

    setSelectedUtility(null);
    setGameState(restarted);
    window.dispatchEvent(new CustomEvent('cob-restart-run', { detail: restarted }));
  };

  const goToNextCave = () => {
    const targetCave = gameState.nextCaveAvailable ?? gameState.cave + 1;

    const nextState = {
      ...gameState,
      cave: targetCave,
      hp: gameState.maxHp,
      bombs: 0,
      inLobby: false,
      lobbyReason: null,
      nextCaveAvailable: null,
      outcomeCave: null,
      lastMessage: `Você entrou no mapa ${targetCave}.`
    };

    setGameState(nextState);
    window.dispatchEvent(new CustomEvent('cob-next-cave', { detail: nextState }));
  };

  const useUtility = (utilityId) => {
    if (gameState.inLobby) return;
    if ((gameState.utilities?.[utilityId] ?? 0) <= 0) return;

    window.dispatchEvent(
      new CustomEvent('cob-use-utility', {
        detail: { type: utilityId }
      })
    );
  };

  const showLobby = gameState.inLobby;
  const isExitLobby = gameState.lobbyReason === 'exit';
  const isDeathLobby = gameState.lobbyReason === 'death';
  const resolvedOutcomeCave = gameState.outcomeCave ?? gameState.cave;

  return (
    <div className="app-shell">
      <main className="game-area">
        {!showLobby && (
          <>
            <div className="top-hud">
              <div className="hud-pill">
                <span>Moedas</span>
                <strong>{gameState.coins}</strong>
              </div>

              <div className="hud-pill">
                <span>Vida</span>
                <strong>{gameState.hp}/{gameState.maxHp}</strong>
              </div>
            </div>

            <div className="utility-bar-wrap">
              <div className="utility-bar">
                {utilityCatalog.map((utility) => {
                  const count = gameState.utilities?.[utility.id] ?? 0;
                  const isSelected = selectedUtility === utility.id;

                  return (
                    <div key={utility.id} className={`utility-slot ${isSelected ? 'selected' : ''}`}>
                      <button
                        className="utility-icon-btn"
                        type="button"
                        onClick={() => setSelectedUtility(isSelected ? null : utility.id)}
                        disabled={count <= 0}
                        title={`${utility.name} · ${count}`}
                      >
                        <span className="utility-icon">{utility.icon}</span>
                        <span className="utility-count">x{count}</span>
                      </button>

                      <span className="utility-label">{utility.name}</span>

                      {isSelected && count > 0 && (
                        <button className="utility-use-btn" type="button" onClick={() => useUtility(utility.id)}>
                          Usar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {showLobby && (
          <div className="lobby-overlay">
            <div className="lobby-modal">
              <section className={`result-card ${isDeathLobby ? 'death' : 'win'}`}>
                <div className={`result-badge ${isDeathLobby ? 'death' : 'win'}`}>
                  {isDeathLobby ? 'DERROTA' : 'CAVE CONCLUÍDA'}
                </div>

                <h1>
                  {isDeathLobby
                    ? `Você morreu na Cave ${resolvedOutcomeCave}`
                    : `Você concluiu a Cave ${resolvedOutcomeCave}`}
                </h1>

                <p>
                  {isDeathLobby
                    ? 'A run foi interrompida. Seus utilitários da mochila foram perdidos no caos subterrâneo.'
                    : 'Você abriu o caminho até a saída. Agora pode melhorar seu equipamento, abastecer a mochila e seguir para a próxima cave.'}
                </p>
              </section>

              <section className="lobby-stats-row">
                <div className="mini-stat">
                  <span>Moedas</span>
                  <strong>{gameState.coins}</strong>
                </div>

                <div className="mini-stat">
                  <span>Vida atual</span>
                  <strong>{gameState.hp}/{gameState.maxHp}</strong>
                </div>

                <div className="mini-stat">
                  <span>Picareta</span>
                  <strong>Nv. {gameState.pickaxeLevel}</strong>
                </div>

                <div className="mini-stat">
                  <span>Próxima entrada</span>
                  <strong>
                    {isDeathLobby
                      ? 'Cave 1'
                      : `Cave ${gameState.nextCaveAvailable ?? gameState.cave + 1}`}
                  </strong>
                </div>
              </section>

              <section className="lobby-card">
                <div className="section-head">
                  <h2>Melhorias permanentes</h2>
                  <p>As melhorias ficam com você entre runs. Picareta nível 3 ganha chance de quebrar duas rochas.</p>
                </div>

                <div className="upgrade-list clean-upgrade-list">
                  {availableUpgrades.length === 0 && (
                    <div className="empty-state">
                      <p>Todas as melhorias do alpha já foram compradas.</p>
                    </div>
                  )}

                  {availableUpgrades.map((upgrade) => {
                    const canBuy = gameState.coins >= upgrade.cost;

                    return (
                      <div key={upgrade.id} className="upgrade-row">
                        <div className="upgrade-copy">
                          <strong>{upgrade.name}</strong>
                          <p>{upgrade.description}</p>
                        </div>

                        <button
                          className="upgrade-buy-btn"
                          onClick={() => buyUpgrade(upgrade)}
                          disabled={!canBuy}
                        >
                          {canBuy
                            ? `Comprar · ${upgrade.cost}`
                            : `Faltam ${upgrade.cost - gameState.coins}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="lobby-card">
                <div className="section-head">
                  <h2>Loja de utilitários da run</h2>
                  <p>Você pode comprar quantos quiser, mas se morrer perde tudo. Eles aparecem acima do mapa durante a exploração.</p>
                </div>

                <div className="upgrade-list clean-upgrade-list">
                  {utilityCatalog.map((utility) => {
                    const canBuy = gameState.coins >= utility.cost;
                    const owned = gameState.utilities?.[utility.id] ?? 0;

                    return (
                      <div key={utility.id} className="upgrade-row utility-shop-row">
                        <div className="upgrade-copy utility-copy">
                          <div className="utility-shop-head">
                            <span className="utility-shop-icon">{utility.icon}</span>
                            <strong>{utility.name}</strong>
                          </div>
                          <p>{utility.description}</p>
                          <small>Na mochila: {owned}</small>
                        </div>

                        <button
                          className="upgrade-buy-btn"
                          onClick={() => buyUtility(utility)}
                          disabled={!canBuy}
                        >
                          {canBuy
                            ? `Comprar · ${utility.cost}`
                            : `Faltam ${utility.cost - gameState.coins}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="lobby-card">
                <div className="section-head">
                  <h2>{isDeathLobby ? 'Tentar novamente' : 'Avançar'}</h2>
                  <p>{gameState.lastMessage}</p>
                </div>

                <div className="action-row">
                  {isExitLobby && (
                    <button className="primary-btn" onClick={goToNextCave}>
                      Ir para a próxima cave
                    </button>
                  )}

                  {isDeathLobby && (
                    <button className="ghost-btn" onClick={restartRun}>
                      Reiniciar run
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        <div ref={containerRef} className="game-container" />

        <div className="rotate-device-hint">
          Gire o celular para a horizontal para jogar com a interface inteira na tela.
        </div>
      </main>
    </div>
  );
}
