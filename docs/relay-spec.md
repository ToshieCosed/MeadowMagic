# Minecraft Java 1.13–1.15: Pressure-Plate Water Momentum Relay

## Objective

Implement a repeating water-stream item transportation system based on the behaviour of dropped item entities in Minecraft Java Edition versions 1.13 through 1.15.

The purpose is to transport loose items horizontally over long distances using multiple independent water streams, without requiring:
- One-block drops between water sections.
- Continuous water channels.
- Side walls to contain items.
- Ice beneath every transition.
- Manual or artificial item repositioning.

The system relies on preserving an item's horizontal momentum when it leaves one water stream and allowing the next water stream to apply additional forward movement.

## 1. World Layout

Construct a repeating sequence of water channels.

Each section consists of:

1. A water source or flowing-water section.
2. A horizontal water stream approximately eight blocks long.
3. A pressure plate positioned at the end of the stream to interrupt water propagation.
4. A short transition area through which dropped items can continue travelling.
5. Another independently established water source or flowing-water section.

Repeat this arrangement for as many sections as necessary.

The pressure plate does not need ice beneath it. Ice or packed ice can optionally be used on the floor to reduce friction and help items preserve their horizontal velocity between water streams.

## 2. Water and Item Physics Must Be Independent

Do not treat dropped items as objects that are permanently attached to water currents.

Dropped items must have their own independent position and velocity.

Water currents should influence item velocity while the item intersects a water volume, but leaving the water must not immediately eliminate the item's existing horizontal velocity.

The pressure plate should interrupt water propagation without acting as an item barrier.

The important distinction is:

- Water connectivity determines where water flows.
- Water currents determine how water influences dropped items.
- Item velocity determines how dropped items continue moving independently of water.

These three systems must remain separate.

## 3. Item Movement

Every dropped item should maintain at least:

- World position.
- Horizontal velocity.
- Vertical velocity.
- Current environmental state.
- Surface friction.
- Whether it is intersecting water.

When an item is inside a flowing-water section, the water current should apply acceleration in the direction of the current.

When the item leaves the water, stop applying that water's acceleration but preserve its existing horizontal velocity.

The item should continue travelling according to its remaining velocity, with environmental friction gradually reducing its speed.

Do not immediately stop, reposition, or reset the item when it leaves a water block.

## 4. Pressure Plate Behaviour

The pressure plate is a water-flow obstruction, not an item-transport obstruction.

When water reaches the pressure plate, it must not propagate through the plate into the next section.

However, dropped items must be able to travel across or past the pressure plate.

The item must retain its existing horizontal velocity while crossing the separator.

The pressure plate must not:
- Reset item velocity.
- Stop item movement.
- Apply an artificial vertical drop.
- Require ice underneath itself.
- Destroy or disable the next water source.

The next water section must have its own independently established water current.

## 5. Momentum Transfer Between Water Streams

This is the central behaviour to reproduce.

The sequence should work as follows:

1. An item enters the first water stream.
2. The flowing water applies forward acceleration to the item.
3. The item travels toward the end of the stream.
4. The pressure plate interrupts water propagation.
5. The item leaves the water but retains horizontal velocity.
6. The item continues sliding forward across the transition.
7. The item enters the next water stream.
8. The next water current applies additional forward acceleration.
9. The item continues into the next section.
10. Repeat indefinitely while the relevant chunks remain loaded.

The next water stream should not simply overwrite the item's velocity with a fixed water speed. It should influence the existing velocity through the water-current physics.

This allows existing momentum and additional current acceleration to work together.

## 6. Ice and Surface Friction

Ice and packed ice are optional enhancements.

Use different friction values for different surfaces:

- Ordinary ground: Normal friction.
- Ice: Reduced friction.
- Packed ice: Reduced friction.
- Water: Water-current acceleration and water-specific drag.

When an item travels outside water, its horizontal velocity should gradually decay according to the surface it occupies.

The pressure plate itself does not require an ice block underneath it.

The system must remain functional without ice at the pressure-plate transition.

## 7. Continuous Transportation

The transportation system should support an arbitrary number of consecutive water sections.

There should be no hardcoded maximum number of sections.

As long as each next water section is correctly established and the item can physically reach it, the item should continue travelling.

Chunk loading must be respected. When a chunk unloads, the engine should pause simulation of entities within that chunk rather than resetting their velocity or destroying their movement state.

When the chunk loads again, the item should resume with its previously stored position and velocity.

## 8. Historical Physics Compatibility

The intended reference behaviour is Minecraft Java Edition 1.13–1.15.

Do not assume that modern Minecraft item movement is identical to the historical behaviour.

The implementation should expose configurable parameters for:

- Water-current acceleration.
- Water drag.
- Ground friction.
- Ice friction.
- Maximum horizontal velocity.
- Maximum vertical velocity.

Do not impose an arbitrary horizontal velocity limit that prevents cumulative movement across successive water streams.

The exact numerical physics values should be calibrated against the historical Minecraft behaviour rather than invented.

## 9. Physics Update Order

Use a consistent simulation sequence:

1. Read the item's current position and velocity.
2. Detect whether the item intersects a water volume.
3. Determine the water-current direction and strength.
4. Apply water-current acceleration if applicable.
5. Apply environmental friction and drag.
6. Resolve collisions.
7. Update the item's position.
8. Detect whether the item has entered another water volume.
9. Repeat on the next simulation tick.

Use swept collision detection or sufficiently small physics substeps to prevent fast-moving items from skipping water volumes entirely.

## 10. Essential Acceptance Tests

The implementation should pass the following tests:

**Test A: Water interruption**

An item travelling through water reaches a pressure plate. Water propagation stops, but the item continues moving.

**Test B: Momentum preservation**

An item exits a water stream and crosses the pressure-plate transition without losing all horizontal velocity.

**Test C: Water-current reacceleration**

An item enters the next independent water stream and receives additional forward acceleration.

**Test D: Ice independence**

The mechanism works without ice beneath the pressure plate.

**Test E: No vertical drop**

The item can transition between water sections at the same floor elevation without requiring a one-block drop.

**Test F: No side walls**

The item can follow the intended horizontal trajectory without requiring continuous side walls.

**Test G: Repeated sections**

The item can pass through numerous consecutive water sections without velocity resetting or requiring manual intervention.

**Test H: Chunk persistence**

Unloading and reloading chunks does not arbitrarily reset the item's stored velocity or position.

## Core Principle

Water currents control item acceleration. Pressure plates interrupt water connectivity. Dropped items retain their own independent velocity.

The intended behaviour is a repeating momentum relay in which each water stream contributes additional forward movement while the item carries its existing horizontal momentum across the transitions.

This is a behavioural reconstruction of the historical Minecraft mechanic, not a claim that the exact original Minecraft physics constants have been recovered. The implementation should prioritize reproducing the observed behaviour over introducing artificial movement rules that simplify or replace it.
