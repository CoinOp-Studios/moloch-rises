// runs tailwind
import './main.css';

import Phaser from 'phaser';

import roundButtons from './assets/buttons-round-200x201.png'
import flaresJson from './assets/particles/flares.json';
import flares from './assets/particles/flares.png';
import sparklePng from './assets/particles/sparkle1.png'
import ceo_game from './assets/sprites/ceo_game.png';
import ceo_lg from './assets/sprites/ceo_nft.png';
import physique_game from './assets/sprites/physique_game.png';
import physique_lg from './assets/sprites/physique_nft.png';
import scientist_game from './assets/sprites/scientist_game.png';
import scientist_lg from './assets/sprites/scientist_nft.png';
import { getOwnedAvatars, mintAvatar } from './avatar';
import { LabScene, TILEHEIGHT, TILEWIDTH } from './labScene';
import { connect } from './wallet';

const BUTTON_FRAMES = {
    INACTIVE: 8,
    CONNECTING: 4,
    CONNECTED: 6,
};

const FAKE_IMAGES = [
    ceo_lg,
    physique_lg,
    scientist_lg,
];

function getAvatarImage(avatar, index) {
    return FAKE_IMAGES[index % FAKE_IMAGES.length];
}

const makeAvatarChoice = (avatar, index, key, callback) => {
    const choice = document.createElement('li');
    choice.id = key;
    const cid = avatar.fields.image.split('/').pop();
    const image = `http://ipfs.io/ipfs/${cid}`;
    console.log('image', image, avatar.fields.image);
    choice.innerHTML = `<img src="${image}" height="256" width="256" />`;
    choice.addEventListener('click', () => {
        callback(avatar, index);
    });
    return choice;
}

class WalletConnect extends Phaser.Scene {
    sprites = {};
    spriteFrames = { 'wallet': BUTTON_FRAMES.INACTIVE, 'playerButton': BUTTON_FRAMES.INACTIVE };
    provider = null;
    account = '';
    walletButtonEmitter = null;
    playerButtonEmitter = null;
    avatars = [];
    currentAvatar = null;
    avatarButtonImage = null;

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
        this.load.image('scientist', scientist_game);
        /* this.load.spritesheet('scientist', scientist_game, {
            frameWidth: 64,
            frameHeight: 64,
            endFrame: 0,
        }); */
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js')
    }

    create() {
        const { width, height } = this.scale;
        console.log('width', width, 'height', height);
        const boardOutline = this.add.rectangle(0, 0, width - 100, height - 150, 0xffff44);
        boardOutline.setOrigin(0, 0);
        boardOutline.setFillStyle(0x888888, 0.5);
        //boardOutline.setScale(2);
        boardOutline.setPosition(50, 110);
        const walletConnectButton = this.add.sprite(width - 50, 50, 'roundButtons', BUTTON_FRAMES.INACTIVE);
        walletConnectButton.setScale(0.35);
        this.sprites.wallet = walletConnectButton;
        this.makeWalletButtonInteractive(walletConnectButton);

        const playerButton = this.add.sprite(width - 150, 50, 'roundButtons', BUTTON_FRAMES.INACTIVE);
        playerButton.setScale(0.35);
        this.sprites.playerButton = playerButton;

        const particles = this.add.particles('flares');
        this.walletButtonEmitter = particles.createEmitter({
            frame: { frames: ['red', 'yellow'], cycle: true },
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
        this.playerButtonEmitter = particles.createEmitter({
            active: false,
            frame: { frames: ['red', 'yellow'], cycle: true },
            x: width - 150,
            y: 50,
            blendMode: 'ADD',
            scale: { start: 0.15, end: 0.1 },
            speed: { min: -100, max: 100 },
            emitZone: {
                source: new Phaser.Geom.Circle(0, 0, 38),
                type: 'edge',
                quantity: 64,
                yoyo: false,
            },
        });

        WebFont.load({
            google: {
                families: ['Nosifer']
            },
            active: () => {
                this.add.text(48, 62, 'Moloch Rises', { fontFamily: 'Nosifer', fontSize: '48px', fill: '#ff3864' });
            }
        });

        document.getElementById('avatar-select-close').addEventListener('click', () => {
            this.hideAvatarSelect();
        });

        document.getElementById('avatar-mint').addEventListener('click', () => {
            this.mintAvatarForUser();
        });
    }

    toggleAvatarSelect(state) {
        document.getElementById("avatar-select").style.display = state ? "block" : "none";
    }

    mintAvatarForUser() {
        this.provider.listAccounts().then(network => {
            const account = network[0];
            mintAvatar(this.provider, account).then(() => {
                this.updateOwnedAvatars(this.provider, account);
            });
        });
    }

    makePlayerButtonInteractive(button) {
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        button.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        button.on('pointerover', this.onPlayerOver, this);
        button.on('pointerout', this.onPlayerOut, this);
        button.on('pointerdown', this.onPlayerClick, this);
        console.log('make player button interactive', button);
    }

    makeWalletButtonInteractive(wallet) {
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
            this.walletButtonEmitter.start();
            return;
        }
        console.log('connecting', button);
        this.sprites.wallet.removeInteractive();
        this.spriteFrames.wallet = BUTTON_FRAMES.CONNECTING;
        this.setSpriteFrame('wallet', false);
        const provider = await connect();
        this.updateConnectionStatus(provider);
        this.setSpriteFrame('wallet', false);
        this.walletButtonEmitter.explode();
        this.makeWalletButtonInteractive(this.sprites.wallet);
    }

    onPlayerClick(button) {
        console.log('click player', button);
        const that = this;
        this.playerButtonEmitter.explode();
        if (this.currentAvatar) {
            this.currentAvatar = null;
            this.updateConnectionStatus(this.provider);
            return;
        }
        this.toggleAvatarSelect(true);
    }

    onOver(button) {
        this.setSpriteFrame('wallet', true);
        console.log('over', button);
    }

    onPlayerOver(button) {
        this.setSpriteFrame('playerButton', true);
        console.log('over player', button);
    }

    onOut(button) {
        this.setSpriteFrame('wallet', false);
        console.log('out', button);
    }

    onPlayerOut(button) {
        this.setSpriteFrame('playerButton', true);
        console.log('out player', button);
    }

    setSpriteFrame(key, hover) {
        const index = this.spriteFrames[key] + (hover ? 1 : 0);
        this.sprites[key].setFrame(index);
    }

    updateConnectionStatus(provider) {
        console.log('connected', provider);
        if (!provider) {
            this.connected = false;
            this.spriteFrames.wallet = BUTTON_FRAMES.INACTIVE;
            return false;
        }

        this.spriteFrames.wallet = BUTTON_FRAMES.CONNECTED;
        this.connected = true;
        this.provider = provider;
        this.makePlayerButtonInteractive(this.sprites.playerButton);
        provider.listAccounts().then((accounts) => {
            if (!accounts) {
                console.log('No addresses, cannot find NFTs');
                this.currentAvatar = null;
            } else {
                const account = accounts[0];
                this.account = account;
                this.updateOwnedAvatars(provider, account);
            }
            if (this.currentAvatar) {
                this.spriteFrames.playerButton = BUTTON_FRAMES.CONNECTED;
            } else {
                this.spriteFrames.playerButton = BUTTON_FRAMES.CONNECTING;
                this.playerButtonEmitter.active = true;
            }
            this.setSpriteFrame('playerButton', false);
        });
        return true;
    }

    setAvatar(avatar, index) {
        console.log('Avatar selected', avatar, index);
        const { width } = this.scale;
        this.currentAvatar = [avatar, index];
        this.toggleAvatarSelect(false);
        this.avatarButtonImage = this.add.image(width - 150, 50, 'scientist');
        this.updateConnectionStatus();
    }

    updateOwnedAvatars(provider, account) {
        const that = this;
        const setAvatar = this.setAvatar.bind(this);
        const addAvatar = (avatar, index) => {
            console.log('addAvatar', avatar, index);
            const raw = JSON.stringify(avatar);
            const ix = that.avatars.findIndex(a => JSON.stringify(a) === raw);
            if (ix === -1) {
                console.log('added avatar', avatar);
                const avatarsElt = document.getElementById("avatar-list");
                that.avatars.push(avatar);
                const key = `avatar-${avatar.id}`;
                if (!document.getElementById(key)) {
                    const choice = makeAvatarChoice(avatar, index, key, setAvatar);
                    console.log('adding', choice);
                    avatarsElt.appendChild(choice);
                }
            } else {
                console.log('updated avatar', avatar);
                that.avatars[ix] = avatar;
            }
        };
        getOwnedAvatars(provider, account).then((avatars) => {
            avatars.forEach(addAvatar);
        });
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
    width: TILEWIDTH * 13, // closest to 800
    height: TILEHEIGHT * 10, // closest to 600
    backgroundColor: '#2d2d2d',
    parent: 'game',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: WalletConnect,
};

const game = new Phaser.Game(phaserConfig);
