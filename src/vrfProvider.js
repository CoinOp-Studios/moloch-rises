export class VrfProvider {
    constructor() {

    }

    // i.e., rolling a 'sided' die
    // returns a value between 1 + 'sides', inlusive
    roll(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }
}