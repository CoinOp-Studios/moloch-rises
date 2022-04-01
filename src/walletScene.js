import Phaser from 'phaser';

import flaresJson from './assets/particles/flares.json';
import flares from './assets/particles/flares.png';
import sparklePng from './assets/particles/sparkle1.png'
import scientist_game from './assets/sprites/scientist_game.png';
import { VIEWPORT_WIDTH } from './constants';
import { getBoardContract, getOwnedAvatars, mintAvatar } from './contractAbi';
import { connect } from './wallet';

const BUTTON_FRAMES = {
    INACTIVE: 'tiles/icons/target-yellow',
    CONNECTING: 'tiles/icons/lightning-yellow',
    CONNECTED: 'tiles/icons/horns-yellow',
    PLAYER_INACTIVE: 'tiles/icons/meeple-gray',
    OFFLINE: 'tiles/buttons/close-gray',
    OFFLINE_SELECTED: 'tiles/buttons/close-yellow'
};

const BAR_SCALE = 0.8;

console.log(`BUTTON_FRAMES: ${JSON.stringify(BUTTON_FRAMES)}`);

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
    emitters = {};
    sprites = {};
    provider = null;
    account = '';
    avatars = [];
    currentAvatar = null;
    boardContract = null;
    avatarButtonImage = null;
    gameScene = null;

    constructor() {
        super();
    }

    preload() {
        this.load.atlas('flares', flares, flaresJson);
        this.load.image('spark', sparklePng);
        this.load.image('scientist', scientist_game);
        this.load.multiatlas('ui', 'assets/moloch.json', 'assets');
    }

    create() {
        const topHUD = this.add.sprite(0, 0, 'ui', 'tiles/frame/Top');
        topHUD.setPosition((VIEWPORT_WIDTH - topHUD.width) / 2, 0);
        const healthBar = this.add.sprite(25, 0, 'ui', 'tiles/hud/section-left-health');
        healthBar.setScale(BAR_SCALE);
        const energyBar = this.add.sprite(VIEWPORT_WIDTH - 200, 0, 'ui', 'tiles/hud/section-right-energy');
        energyBar.setScale(BAR_SCALE);
        energyBar.setPosition(VIEWPORT_WIDTH - (energyBar.width * BAR_SCALE) - 25, 0);
        const walletX = VIEWPORT_WIDTH / 3 * 1.91;
        const wallet = this.add.sprite(walletX, 8, 'ui', BUTTON_FRAMES.INACTIVE);
        wallet.setScale(0.6);
        const playerX = VIEWPORT_WIDTH / 3 * 1.05;
        const playerButton = this.add.sprite(playerX, 8, 'ui', BUTTON_FRAMES.PLAYER_INACTIVE);
        playerButton.setScale(0.5);
        const offlineButton = this.add.sprite(25, 60, 'ui', 'tiles/buttons/close-gray');
        offlineButton.setScale(0.45);

        this.sprites = {
            energyBar,
            healthBar,
            playerButton,
            topHUD,
            wallet,
            offlineButton
        };

        this.makeOfflineButtonInteractive(offlineButton);

        const particles = this.add.particles('flares');
        this.emitters = {
            wallet: particles.createEmitter({
                frame: { frames: ['red', 'yellow'], cycle: true },
                x: walletX + 10,
                y: 10,
                blendMode: 'ADD',
                scale: { start: 0.15, end: 0.1 },
                speed: { min: -100, max: 100 },
                emitZone: {
                    source: new Phaser.Geom.Circle(0, 0, 10),
                    type: 'edge',
                    quantity: 2,
                    yoyo: false,
                }
            }),
            player: particles.createEmitter({
                active: false,
                frame: { frames: ['red', 'yellow'], cycle: true },
                x: playerX + 10,
                y: 10,
                blendMode: 'ADD',
                scale: { start: 0.15, end: 0.1 },
                speed: { min: -100, max: 100 },
                emitZone: {
                    source: new Phaser.Geom.Circle(0, 0, 10),
                    type: 'edge',
                    quantity: 64,
                    yoyo: false,
                },
            }),
        };

        document.getElementById('avatar-select-close').addEventListener('click', () => {
            this.toggleAvatarSelect(false);
        });

        document.getElementById('avatar-mint').addEventListener('click', () => {
            this.mintAvatarForUser();
        });

        this.makeWalletButtonInteractive();
    }

    destroyTooltip() {
        const { sprites: { tooltip, tooltiptext } } = this;

        if (tooltip) {
            tooltip.destroy();
            delete this.sprites.tooltip;
        }

        if (tooltiptext) {
            tooltiptext.destroy();
            delete this.sprites.tooltiptext;
        }
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

    makePlayerButtonInteractive() {
        const button = this.sprites.playerButton;
        const hitArea = new Phaser.Geom.Circle(50, 50, 100);
        button.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        button.on('pointerover', this.onPlayerOver, this);
        button.on('pointerout', this.onPlayerOut, this);
        button.on('pointerdown', this.onPlayerClick, this);
        console.log('make player button interactive', button);
    }

    makeWalletButtonInteractive() {
        const { wallet } = this.sprites;
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
        this.destroyTooltip();
        if (this.connected) {
            this.disconnectWallet();
            return;
        }
        console.log('connecting', button);
        this.sprites.wallet.removeInteractive();
        this.sprites.wallet.setFrame(BUTTON_FRAMES.CONNECTING);
        const provider = await connect();
        console.log('connected');
        this.updateConnectionStatus(provider);
        this.emitters.wallet.stop();

        this.makeWalletButtonInteractive(this.sprites.wallet);
    }

    onPlayerClick(button) {
        const that = this;
        this.emitters.player.stop();
        this.destroyTooltip();
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
        this.emitters.wallet.stop();
        this.sprites.wallet = BUTTON_FRAMES.INACTIVE;
        this.sprites.playerButton = BUTTON_FRAMES.INACTIVE;
        this.sprites.offlineButton = BUTTON_FRAMES.CONNECTED;
        this.offline = true;
    }

    onOver() {
        if (!this.connected) {
            this.sprites.tooltip = this.add.sprite(-1000, -1000, 'ui', 'tiles/tooltip/top-right-gold');
            const { wallet, tooltip } = this.sprites;
            const tX = wallet.x - tooltip.width / 3;
            const tY = wallet.y + tooltip.height;
            this.sprites.tooltip.setPosition(tX, tY);
            this.sprites.tooltiptext = this.add.text(
                wallet.x - tooltip.width / 3 * 2,
                tY,
                'Connect to wallet',
                { fontSize: '12px', fill: '#fff', fontFamily: 'Consolas' }
            );
        }
    }

    onPlayerOver(button) {
        if (this.connected && !this.currentAvatar) {
            this.sprites.tooltip = this.add.sprite(-1000, -1000, 'ui', 'tiles/tooltip/top-left-gold');
            const { playerButton, tooltip } = this.sprites;
            const tX = playerButton.x + tooltip.width / 3 * 1.25;
            const tY = playerButton.y + tooltip.height;
            this.sprites.tooltip.setPosition(tX, tY);
            this.sprites.tooltiptext = this.add.text(
                playerButton.x,
                tY,
                'Select avatar',
                { fontSize: '12px', fill: '#fff', fontFamily: 'Consolas' }
            );
        }
    }

    onOfflineOver(button) {
        if (!this.currentAvatar) {
            this.sprites.tooltip = this.add.sprite(-1000, -1000, 'ui', 'tiles/tooltip/top-left-gold');
            const { offlineButton, tooltip } = this.sprites;
            const tX = offlineButton.x + tooltip.width / 3 * 1.6;
            const tY = offlineButton.y + tooltip.height;
            this.sprites.tooltip.setPosition(tX, tY);
            this.sprites.tooltiptext = this.add.text(
                offlineButton.x,
                tY,
                'Play off-chain',
                { fontSize: '12px', fill: '#fff', fontFamily: 'Consolas' }
            );
        }
    }

    onOut(button) {
        // console.log('out', button);
        this.destroyTooltip();
    }

    onPlayerOut(button) {
        this.destroyTooltip();
    }

    onOfflineOut(button) {
        this.destroyTooltip();
    }

    updateConnectionStatus(prov) {
        const provider = prov || this.provider;
        if (!provider) {
            this.connected = false;
            this.sprites.wallet.setFrame(BUTTON_FRAMES.INACTIVE);
            return false;
        }
        console.log('connected', provider);
        this.sprites.wallet.setFrame(BUTTON_FRAMES.CONNECTED);
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
                // for now, this will be a terminal state until page refresh
                // you won't be able to switch avatars until your next game
                this.sprites.wallet.removeInteractive();
                this.sprites.playerButton.removeInteractive();
                this.sprites.offlineButton.removeInteractive();
                this.sprites.playerButton.setFrame(BUTTON_FRAMES.CONNECTED);
            } else {
                this.sprites.playerButton.setFrame(BUTTON_FRAMES.CONNECTING);
                this.emitters.player.active = true;
            }
        });
        //this.gameScene.provider = provider;
        return true;
    }

    setAvatar(avatar, index) {
        console.log('Avatar selected', avatar, index);
        const { VIEWPORT_WIDTH } = this.scale;
        this.currentAvatar = [avatar, index];
        this.toggleAvatarSelect(false);
        this.avatarButtonImage = this.add.image(VIEWPORT_WIDTH - 150, 50, 'scientist');
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
        this.sprites.wallet.setFrame(BUTTON_FRAMES.INACTIVE);
        this.sprites.playerButton.setFrame(BUTTON_FRAMES.INACTIVE);
        this.emitters.player.stop();
        if (this.provider != null && this.connected) {
            // If the cached provider is not cleared,
            // WalletConnect will default to the existing session
            // and does not allow to re-scan the QR code with a new wallet.
            await web3Modal.clearCachedProvider();
        }
        this.connected = false;
        this.emitters.wallet.start();
    }
}
