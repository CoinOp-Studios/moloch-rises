import Phaser from 'phaser';

import roundButtons from './assets/buttons-round-200x201.png'
import flaresJson from './assets/particles/flares.json';
import flares from './assets/particles/flares.png';
import sparklePng from './assets/particles/sparkle1.png'
import { connect } from './wallet';
import { DungeonScene } from './dungeonScene';

const BUTTON_FRAMES = {
    INACTIVE: 8,
    CONNECTING: 4,
    CONNECTED: 6,
};

const emitterProps = {
    blendMode: 'SCREEN',
    scale: { start: 0.15, end: 0.0015 },
    speed: { min: -100, max: 100 },
    quantity: 1,
    lifespan: { min: 1000, max: 4000 },
    maxParticles: 100,
};

class WalletConnect extends Phaser.Scene {
    sprites = {};
    spriteFrames = { 'wallet': BUTTON_FRAMES.INACTIVE };
    provider = null;
    buttonEmitter = null;

    constructor() {
        super();
    }

    preload() {
        this.load.spritesheet('roundButtons', roundButtons, {
            frameWidth: 200,
            frameHeight: 201,
            endFrame: 9,
        });
        this.load.atlas('flares', flares, flaresJson);
        this.load.image('spark', sparklePng);
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js')
    }

    create() {
        const { width, height } = this.scale;
        console.log('width', width, 'height', height);
        const boardOutline = this.add.rectangle(0, 0, width - 100, height - 150, 0xffff44);
        const sparks = this.add.particles('spark');
        sparks.createEmitter({
            x: 70,
            y: 100,
            emitZone: {
                source: new Phaser.Geom.Line(0, 0, 1, 0),
                quantity: 10,
                type: 'edge',
                yoyo: false,
            },
            gravityY: 200,
            gravityX: 400,
            ...emitterProps,
        });
        sparks.createEmitter({
            x: width - 70,
            y: 100,
            emitZone: {
                source: new Phaser.Geom.Line(0, 0, 1, 0),
                quantity: 10,
                type: 'edge',
                yoyo: false,
            },
            gravityY: 200,
            gravityX: -400,
            ...emitterProps,
        });
        boardOutline.setOrigin(0, 0);
        boardOutline.setFillStyle(0x888888, 0.5);
        //boardOutline.setScale(2);
        boardOutline.setPosition(50, 110);
        const wallet = this.add.sprite(width - 50, 50, 'roundButtons', BUTTON_FRAMES.INACTIVE);
        wallet.setScale(0.35);
        this.makeWalletInteractive(wallet);
        this.sprites.wallet = wallet;
        const particles = this.add.particles('flares');
        const buttonEmitter = particles.createEmitter({
            frame: { frames: ['blue', 'yellow'], cycle: true },
            x: width - 50,
            y: 50,
            blendMode: 'ADD',
            scale: { start: 0.15, end: 0.1 },
            speed: { min: -100, max: 100 },
            emitZone: {
                source: new Phaser.Geom.Circle(0, 0, 38),
                type: 'edge',
                quantity: 64,
                yoyo: false,
            }
        });
        this.buttonEmitter = buttonEmitter;

        WebFont.load({
            google: {
                families: ['Nosifer']
            },
            active: () => {
                this.add.text(48, 62, 'Raid at Moloch Central', { fontFamily: 'Nosifer', fontSize: '48px', fill: '#ff3864' });
            }
        });
    }

    makeWalletInteractive(wallet) {
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        wallet.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        wallet.on('pointerover', this.onOver, this);
        wallet.on('pointerout', this.onOut, this);
        wallet.on('pointerdown', this.onClick, this);
    }

    async onClick(button) {
        if (this.connected) {
            console.log('disconnected');
            this.spriteFrames.wallet = BUTTON_FRAMES.INACTIVE;
            this.setSpriteFrame('wallet', false);
            this.connected = false;
            this.provider.disconnect();
            this.buttonEmitter.start();
            return;
        }
        console.log('connecting', button);
        this.sprites.wallet.removeInteractive();
        this.spriteFrames.wallet = BUTTON_FRAMES.CONNECTING;
        this.setSpriteFrame('wallet', false);
        const provider = await connect();
        console.log('connected', provider);
        if (provider) {
            this.spriteFrames.wallet = BUTTON_FRAMES.CONNECTED;
            this.connected = true;
            this.provider = provider;
        } else {
            this.connected = false;
            this.spriteFrames.wallet = BUTTON_FRAMES.INACTIVE;
        }
        this.setSpriteFrame('wallet', false);
        this.buttonEmitter.explode();
        this.makeWalletInteractive(this.sprites.wallet);
    }

    onOver(button) {
        this.setSpriteFrame('wallet', true);
        console.log('over', button);
    }

    onOut(button) {
        this.setSpriteFrame('wallet', false);
        console.log('out', button);
    }

    setSpriteFrame(key, hover) {
        const index = this.spriteFrames[key] + (hover ? 1 : 0);
        this.sprites[key].setFrame(index);
    }
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
    },
    scene: WalletConnect,
};

const phaserConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    parent: 'phaser-example',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: [ DungeonScene ]
};

const game = new Phaser.Game(phaserConfig);
