# Hamster AI prototype for Godot 4

This is an **experimental standalone module**. It is not yet wired into the existing HAMSTER LIFE gameplay.

## Scene setup
1. Add a Node3D called HamsterAI and attach `godot/hamster_brain.gd`.
2. Add the imported GLB hamster as a child, and attach `godot/hamster_locomotion.gd` to its root.
3. Add three Marker3D nodes: FoodPoint, WaterPoint, BedPoint (at the relevant cage locations).
4. Assign the four exported references in the HamsterAI inspector.
5. Set the HamsterAI origin to the cage centre and roam_radius to a value that keeps the model inside the cage.

## Behaviors
The brain tracks hunger, thirst and fatigue on a 0–100 scale; larger values mean greater need. It wanders, seeks food/water/bed, then eats, drinks or sleeps. The locomotion script receives a direction vector and animates paw pivots.

## Current limitations
No collision avoidance, navigation mesh, food inventory, actual water consumption, save/load, illness, aging, death, or offline progression yet. All values are prototypes and not biologically calibrated. The walk controller moves the model directly and requires an unobstructed floor. Do not use this module for a production release until tested in Godot.
