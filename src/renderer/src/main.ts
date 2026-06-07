import Phaser from "phaser";
import { TimbaScene } from "./scenes/TimbaScene.js";
import "./styles.css";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1280,
  height: 760,
  parent: "game",
  backgroundColor: "#121018",
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: false
  },
  scene: [TimbaScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});
