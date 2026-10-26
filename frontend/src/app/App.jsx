import { useSyncExternalStore } from "react";
import { GameCanvas } from "../game/GameCanvas.jsx";
import { getUiSnapshot, subscribeUiStore } from "../game/ui-store.js";
import { MenuScreen } from "../features/MenuScreen.jsx";
import { LevelSelectScreen } from "../features/LevelSelectScreen.jsx";
import { SkillCodexScreen, ZombieCodexScreen } from "../features/CodexScreens.jsx";
import { AccountScreen, LoginScreen } from "../features/AccountScreens.jsx";
import { AttributesScreen, CharacterScreen, EquipmentBagScreen, EquipmentScreen, WallScreen } from "../features/CharacterScreens.jsx";
import { BattleHud, PauseOverlay, ResultOverlay, UpgradeOverlay } from "../features/BattleOverlays.jsx";
import { TestArenaPanel } from "../features/TestArenaPanel.jsx";

function ScreenRouter({ snapshot }) {
  switch (snapshot.screen) {
    case "menu": return <MenuScreen snapshot={snapshot} />;
    case "levelSelect": return <LevelSelectScreen snapshot={snapshot} />;
    case "zombieCodex": return <ZombieCodexScreen />;
    case "skillCodex": return <SkillCodexScreen />;
    case "login": return <LoginScreen snapshot={snapshot} />;
    case "account": return <AccountScreen snapshot={snapshot} />;
    case "attributes": return <AttributesScreen snapshot={snapshot} />;
    case "character": return <CharacterScreen snapshot={snapshot} />;
    case "equipment": return <EquipmentScreen snapshot={snapshot} />;
    case "equipmentBag": return <EquipmentBagScreen snapshot={snapshot} />;
    case "wall": return <WallScreen snapshot={snapshot} />;
    case "playing":
    case "testArena": return <BattleHud snapshot={snapshot} />;
    case "paused": return <PauseOverlay />;
    case "upgrade": return <UpgradeOverlay snapshot={snapshot} />;
    case "victory":
    case "defeat":
    case "retreat": return <ResultOverlay snapshot={snapshot} />;
    default: return <MenuScreen snapshot={snapshot} />;
  }
}

export default function App() {
  const snapshot = useSyncExternalStore(subscribeUiStore, getUiSnapshot, getUiSnapshot);
  return (
    <main id="app-layout">
      <section id="game-shell">
        <GameCanvas />
        <div className={"react-ui screen-" + snapshot.screen}>
          <ScreenRouter snapshot={snapshot} />
        </div>
      </section>
      {snapshot.screen === "testArena" ? <TestArenaPanel snapshot={snapshot} /> : null}
    </main>
  );
}
