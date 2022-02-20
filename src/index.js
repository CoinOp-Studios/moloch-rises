// runs tailwind
import './main.css';

import Phaser from 'phaser';

import { LabScene, TILEHEIGHT, TILEWIDTH } from './labScene';
import { WalletScene } from './walletScene';

class GameWrapper extends Phaser.Scene {
    constructor() {
        super();
    }

    create() {
        var labScene = this.scene.add('lab', LabScene, true);
        var walletScene = this.scene.add('wallet', WalletScene, true);
    }
}

const walletConfig = {
    type: Phaser.AUTO,
    width: TILEWIDTH * 13,
    height: 100,
    backgroundColor: '#2d2d2d',
    parent: 'wallet',
    pixelArt: true,
    scene: WalletScene,
};

const gameConfig = {
    type: Phaser.AUTO,
    width: TILEWIDTH * 13, // closest to 800
    height: TILEHEIGHT * 10, // closest to 600 + fringe for buttons
    backgroundColor: '#2d2d2d',
    parent: 'game',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: LabScene,
    walletGame: null
};

const wrapperConfig = {
    type: Phaser.AUTO,
    width: TILEWIDTH * 15, // closest to 800
    height: TILEHEIGHT * 12, // closest to 600 + fringe for buttons
    backgroundColor: '#2d2d2d',
    parent: 'game',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: GameWrapper,
};

var game = new Phaser.Game(wrapperConfig);