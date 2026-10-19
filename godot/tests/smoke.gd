extends SceneTree
var failures := 0
func _initialize() -> void:
 call_deferred("run")
func check(ok: bool, message: String) -> void:
 if not ok:
  push_error(message)
  failures += 1
func run() -> void:
 var scene := load("res://main.tscn") as PackedScene
 var game := scene.instantiate()
 root.add_child(game)
 var brain: Node = game.brain
 brain.set_physics_process(false)
 brain.model.set_physics_process(false)
 # Verify consumables rather than simply decreasing hunger for free.
 brain.hunger = 80.0
 brain.food_amount = 1.0
 brain.state = brain.State.EAT
 brain._activity_timer = 3.0
 brain._physics_process(.5)
 check(brain.food_amount == 0.0 and brain.hunger > 70.0, "Eating must consume actual stock")
 brain.thirst = 80.0
 brain.water_amount = 1.0
 brain.state = brain.State.DRINK
 brain._activity_timer = 3.0
 brain._physics_process(.5)
 check(brain.water_amount == 0.0 and brain.thirst > 70.0, "Drinking must consume actual stock")
 brain.food_amount = 23.0
 brain.water_amount = 34.0
 check(HamsterSave.save_brain(brain), "Save must succeed")
 brain.food_amount = 0.0
 check(HamsterSave.load_brain(brain) and brain.food_amount == 23.0, "Inventory must restore")
 var file := FileAccess.open(HamsterSave.SAVE_PATH, FileAccess.WRITE)
 file.store_string('{"version":1,"hunger":2,"thirst":3,"fatigue":4,"saved_at_unix":0,"food_amount":"bad"}')
 file.close()
 brain.hunger = 77.0
 check(not HamsterSave.load_brain(brain) and brain.hunger == 77.0, "Corrupt saves must not partly mutate state")
 DirAccess.remove_absolute(HamsterSave.SAVE_PATH)
 if "--require-glb" in OS.get_cmdline_user_args():
  check(game.using_glb, "CI must instantiate generated Blender GLB")
  for name in ["PawPivot_L_Front", "PawPivot_R_Front", "PawPivot_L_Rear", "PawPivot_R_Rear"]:
   check(brain.model.find_child(name, true, false) != null, "Missing paw: " + name)
 print("Godot scene, stock consumption, atomic save and corrupt save checks passed")
 quit(1 if failures > 0 else 0)
