/**
 * The launch pad's frame, in art pixels: the box the pad scene is drawn in,
 * the line its ground runs along, where the rocket stands, and how far the
 * landscape runs on past both sides of the box so it fills any screen. The
 * backdrop, the pad and the scene around it share these, so they always
 * stand on the same ground.
 */
export const PAD_WIDTH = 182;
export const PAD_HEIGHT = 132;
export const GROUND_Y = 128;
/** The middle of the rocket's foot, standing on the platform. */
export const ROCKET_FOOT = { x: 91, y: GROUND_Y - 4 };
export const SCENERY_LEFT = -6000;
export const SCENERY_RIGHT = PAD_WIDTH + 6000;
export const SCENERY_WIDTH = SCENERY_RIGHT - SCENERY_LEFT;
