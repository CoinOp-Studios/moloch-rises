export const Constants = {
    /*/////////////////////////
    ////////////TEXT///////////
    /////////////////////////*/
    FADE_TEXT_RATE: 1/60.0, // fades alpha by this amount each frame

    DAMAGE_FONT_SIZE: 25,
    DAMAGE_FONT: "Consolas",
    DAMAGE_RECEIVED_COLOR: "#dc143c", // crimson
    DAMAGE_BLOCKED_COLOR: "#bec2cb", // grey
    DAMAGE_X_OFFSET_PX: 20, // offsets from the center of the 
    DAMAGE_Y_OFFSET_PX: 0,  //   sprite in px

    DEFAULT_FONT_SIZE: 12,
    DEFAULT_FONT: "Consolas",
    DEFAULT_FONT_COLOR: "#000000", // black
}
Object.freeze(Constants);