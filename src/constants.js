export const Constants = {
    /*************************
     *******TRANSACTIONS******
     ************************/
    BLOCK_CONFIRMS: 5,
    GAME_COST_ETHER: 0.001,
    MINT_COST_ETHER: 0.001,





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

    TURNS_REMAINING_FONT_SIZE_STRING: "40px",
    TURNS_REMAINING_FONT_FAMILY: "source serif pro",
    TURNS_REMAINING_TEXT: "TURNS REMAINING:",
}
Object.freeze(Constants);