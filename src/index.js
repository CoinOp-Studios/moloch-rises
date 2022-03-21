// runs tailwind
import './main.css';

import Phaser from 'phaser';

import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './constants';
import { LabScene } from './labScene';
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

const wrapperConfig = {
    type: Phaser.AUTO,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
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