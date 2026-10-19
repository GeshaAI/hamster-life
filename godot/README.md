# Godot 4.4.1 integration prototype

Open `project.godot` in Godot 4.4.1. Run `main.tscn`. Compatibility renderer is selected for mobile.
The scene joins the existing brain, locomotion and local save modules, and creates a simple cage, house, wheel, feeder, water bottle, camera and refill controls.

The Blender workflow installs the missing NumPy dependency, fails on Python exceptions, validates GLB/BLEND files, imports the generated GLB in Godot, runs `tests/smoke.gd -- --require-glb`, then uploads the source project ZIP alongside the model. Download `hamster-model` in Actions and extract `hamster-godot-project.zip` on the tablet. Without `assets/hamster.glb`, the local scene explicitly displays placeholder geometry.

The GLB is rotated inside the locomotion root: Blender front -Y exports as glTF +Z, while the walker faces Godot -Z. Movement directions use global coordinates even below a rotated parent. The brain consumes actual available food and water; empty bowls do not remove hunger. Saves validate every field before applying it and use a temporary file then rename.

Check locally:
```
godot --headless --path godot --editor --import
godot --headless --path godot --script res://tests/smoke.gd
```

Limits: this is a separate 3D integration demo, not the complete browser game or an APK. Furniture collision avoidance, a skeleton, action animation clips, wheel use, biological health/aging, and Android performance testing are still unfinished. Offline progression is a capped 24-hour approximation of growing needs; it does not run a hidden 3D scene or consume inventory. These saves are separate from browser saves. The procedural Blender model has idle animation, not realistic fur or fully rigged movement. Do not claim device acceptance from a headless check.
