import { useEffect, useRef } from "react";

export function GameCanvas() {
  const canvasRef = useRef(null);
  useEffect(function () {
    let active = true;
    const Game = window.Game;
    Game.mount({ canvas: canvasRef.current }).catch(function (error) {
      if (active) console.error(error);
    });
    return function () {
      active = false;
      Game.destroy();
    };
  }, []);
  return <canvas ref={canvasRef} id="game" width="360" height="640" aria-label="街区警戒线游戏画面" />;
}
