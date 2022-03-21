import Phaser from 'phaser';

import roundButtons from './assets/buttons-round-200x201.png'
import flaresJson from './assets/particles/flares.json';
import flares from './assets/particles/flares.png';
import sparklePng from './assets/particles/sparkle1.png'
import scientist_game from './assets/sprites/scientist_game.png';
import { getOwnedAvatars, mintAvatar, getBoardContract } from './contractAbi';
import { connect, web3Modal } from './wallet';

const BUTTON_FRAMES = {
    INACTIVE: 8,
    CONNECTING: 4,
    CONNECTED: 6,
};

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

export class WalletScene extends Phaser.Scene {
    sprites = {};
    spriteFrames = { 'wallet': BUTTON_FRAMES.INACTIVE, 'playerButton': BUTTON_FRAMES.INACTIVE, 'offlineButton': BUTTON_FRAMES.INACTIVE };
    provider = null;
    account = '';
    walletButtonEmitter = null;
    playerButtonEmitter = null;
    avatars = [];
    currentAvatar = null;
    boardContract = null;
    avatarButtonImage = null;
    gameScene = null;

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
    }

    create() {
        const { width, height } = this.scale;
        console.log('width', width, 'height', height);
        const walletConnectButton = this.add.sprite(width - 50, 50, 'roundButtons', BUTTON_FRAMES.INACTIVE);
        walletConnectButton.setScale(0.35);
        this.sprites.wallet = walletConnectButton;
        this.makeWalletButtonInteractive(walletConnectButton);

        const playerButton = this.add.sprite(width - 150, 50, 'roundButtons', BUTTON_FRAMES.INACTIVE);
        playerButton.setScale(0.35);
        this.sprites.playerButton = playerButton;

        const offlineButton = this.add.sprite(width - 250, 50, 'roundButtons', BUTTON_FRAMES.INACTIVE);
        offlineButton.setScale(0.35);
        this.sprites.offlineButton = offlineButton;
        this.makeOfflineButtonInteractive(offlineButton);

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

    makeOfflineButtonInteractive(offlineButton) {
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        offlineButton.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        offlineButton.on('pointerover', this.onOfflineOver, this);
        offlineButton.on('pointerout', this.onOfflineOut, this);
        offlineButton.on('pointerdown', this.onOfflineClick, this);
    }

    async onClick(button) {
        if (this.connected) {
            this.disconnectWallet();
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

    async onOfflineClick(button) {
        console.log('click offline', button);
        if (this.offline) {
            /*
            this.offline = false;
            this.makePlayerButtonInteractive(this.sprites.playerButton);
            this.makeWalletButtonInteractive(this.sprites.wallet);
            this.spriteFrames.offlineButton = BUTTON_FRAMES.INACTIVE;
            this.walletButtonEmitter.start();
            */
            // if the user opts in to offline, it's locked in until page refresh
            // for now
            return;
        }
        // disable wallet + player select buttons
        console.log('enable offline', button);
        this.sprites.wallet.removeInteractive();
        this.sprites.playerButton.removeInteractive();
        await this.disconnectWallet();
        this.walletButtonEmitter.stop();
        this.spriteFrames.wallet = BUTTON_FRAMES.INACTIVE;
        this.spriteFrames.playerButton = BUTTON_FRAMES.INACTIVE;
        this.spriteFrames.offlineButton = BUTTON_FRAMES.CONNECTED;
        this.offline = true;
    }

    onOver(button) {
        this.setSpriteFrame('wallet', true);
        console.log('over', button);
    }

    onPlayerOver(button) {
        this.setSpriteFrame('playerButton', true);
        console.log('over player', button);
    }

    onOfflineOver(button) {
        this.setSpriteFrame('offlineButton', true);
        console.log('over offline', button);
    }

    onOut(button) {
        this.setSpriteFrame('wallet', false);
        console.log('out', button);
    }

    onPlayerOut(button) {
        this.setSpriteFrame('playerButton', false);
        console.log('out player', button);
    }

    onOfflineOut(button) {
        this.setSpriteFrame('offlineButton', false);
        console.log('out offline', button);
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

        // attempt to retrieve board state as soon as wallet is 
        // successfully connected
        if (this.boardContract == null && !this.retrievingBoardState) {
            this.retrievingBoardState = true;
            getBoardContract(this.provider).then(b => {
                console.log('retrieved board contract');
                this.boardContract = b;
                this.retrievingBoardState = false;
            });
        }
        
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
                // for now, this will be a terminal state until page refresh
                // you won't be able to switch avatars until your next game
                this.sprites.wallet.removeInteractive();
                this.sprites.playerButton.removeInteractive();
                this.sprites.offlineButton.removeInteractive();
            } else {
                this.spriteFrames.playerButton = BUTTON_FRAMES.CONNECTING;
                this.playerButtonEmitter.active = true;
            }
            this.setSpriteFrame('playerButton', false);
        });
        //this.gameScene.provider = provider;
        return true;
    }

    setAvatar(avatar, index) {
        console.log('Avatar selected', avatar, index);
        const { width } = this.scale;
        this.currentAvatar = [avatar, index];
        this.toggleAvatarSelect(false);
        this.avatarButtonImage = this.add.image(width - 150, 50, 'scientist');
        this.updateConnectionStatus(this.provider);
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

    async disconnectWallet() {
        console.log('disconnected');
        this.spriteFrames.wallet = BUTTON_FRAMES.INACTIVE;
        this.spriteFrames.playerButton = BUTTON_FRAMES.INACTIVE;
        this.playerButtonEmitter.stop();
        this.setSpriteFrame('wallet', false);
        if (this.provider != null && this.connected) {
            // If the cached provider is not cleared,
            // WalletConnect will default to the existing session
            // and does not allow to re-scan the QR code with a new wallet.
            await web3Modal.clearCachedProvider();
        }
        this.connected = false;
        this.walletButtonEmitter.start();
    }
}
