// Centralized Rapier collision groups (membership + filter masks).
// Rapier expects a 32-bit integer: (memberships << 16) | filter.
// See: https://rapier.rs/docs/user_guides/javascript/colliders#collision-groups-and-solver-groups

export const CollisionGroup = Object.freeze({
  ARENA: 1 << 0,
  GROUND: 1 << 1,
  ENEMY: 1 << 2,
  CHARACTER: 1 << 3,
  PROJECTILE: 1 << 4,
  GIFT: 1 << 5,
});

export function makeCollisionGroups(memberships, filter) {
  return (memberships << 16) | filter;
}
