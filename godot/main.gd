extends Node3D
## Integration demo; browser version remains the primary game.
const Brain = preload("res://hamster_brain.gd")
const Locomotion = preload("res://hamster_locomotion.gd")
var brain: Node3D
var status: Label
var using_glb := false
func material(color: Color) -> StandardMaterial3D:
 var mat := StandardMaterial3D.new()
 mat.albedo_color = color
 mat.roughness = 0.85
 return mat
func box(size: Vector3, at: Vector3, color: Color) -> MeshInstance3D:
 var node := MeshInstance3D.new()
 var mesh := BoxMesh.new()
 mesh.size = size
 node.mesh = mesh
 node.material_override = material(color)
 add_child(node)
 node.position = at
 return node
func marker(at: Vector3) -> Marker3D:
 var point := Marker3D.new()
 add_child(point)
 point.position = at
 return point
func _ready() -> void:
 var environment := WorldEnvironment.new()
 var settings := Environment.new()
 settings.background_mode = Environment.BG_COLOR
 settings.background_color = Color("e9e2d1")
 settings.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
 settings.ambient_light_color = Color("fff0d7")
 settings.ambient_light_energy = 0.7
 environment.environment = settings
 add_child(environment)
 var light := DirectionalLight3D.new()
 light.rotation_degrees = Vector3(-65, -25, 0)
 light.light_energy = 1.1
 add_child(light)
 var camera := Camera3D.new()
 add_child(camera)
 camera.position = Vector3(3.7, 4.8, 5.2)
 camera.look_at(Vector3.ZERO)
 camera.projection = Camera3D.PROJECTION_ORTHOGONAL
 camera.size = 5.2
 camera.current = true
 box(Vector3(4.2, .16, 3.6), Vector3(0, -.12, 0), Color("dbc599"))
 for side in [-1.0, 1.0]:
  box(Vector3(.09, .45, 3.6), Vector3(side * 2.08, .12, 0), Color("b7986d"))
  box(Vector3(4.2, .45, .09), Vector3(0, .12, side * 1.78), Color("b7986d"))
 box(Vector3(.85, .65, .7), Vector3(-1.1, .3, -.95), Color("bd9366"))
 var roof := box(Vector3(1.0, .12, .9), Vector3(-1.1, .69, -.95), Color("936c48"))
 roof.rotation_degrees.z = -6
 box(Vector3(.3, .4, .015), Vector3(-1.1, .18, -.59), Color("56422e"))
 box(Vector3(.4, .16, .38), Vector3(-1.35, .04, .85), Color("c18e6f"))
 box(Vector3(.3, .03, .28), Vector3(-1.35, .14, .85), Color("96743a"))
 box(Vector3(.18, .7, .18), Vector3(1.45, .4, .7), Color("91bbca"))
 box(Vector3(.15, .07, .09), Vector3(1.35, .12, .7), Color("adb5ac"))
 var wheel := MeshInstance3D.new()
 var torus := TorusMesh.new()
 torus.inner_radius = .4
 torus.outer_radius = .47
 wheel.mesh = torus
 wheel.material_override = material(Color("80947b"))
 add_child(wheel)
 wheel.position = Vector3(1.05, .5, -.95)
 wheel.rotation_degrees.x = 90
 var walker := Node3D.new()
 walker.set_script(Locomotion)
 var asset_path := "res://assets/hamster.glb"
 if ResourceLoader.exists(asset_path):
  var packed := load(asset_path) as PackedScene
  var asset := packed.instantiate() as Node3D
  asset.rotation.y = PI # Blender -Y forward becomes glTF +Z; locomotion faces -Z.
  asset.scale = Vector3.ONE * .55
  walker.add_child(asset)
  using_glb = true
 else:
  var placeholder := MeshInstance3D.new()
  var sphere := SphereMesh.new()
  sphere.radius = .23
  sphere.height = .4
  placeholder.mesh = sphere
  placeholder.position.y = .2
  placeholder.material_override = material(Color("cc9a56"))
  walker.add_child(placeholder)
 brain = Node3D.new()
 brain.set_script(Brain)
 brain.model = walker
 brain.food_point = marker(Vector3(-1.05, 0, .85))
 brain.water_point = marker(Vector3(1.2, 0, .7))
 brain.bed_point = marker(Vector3(-1.1, 0, -.35))
 brain.add_child(walker)
 add_child(brain)
 var canvas := CanvasLayer.new()
 add_child(canvas)
 var panel := VBoxContainer.new()
 panel.position = Vector2(18, 16)
 canvas.add_child(panel)
 status = Label.new()
 status.add_theme_color_override("font_color", Color("493d2e"))
 panel.add_child(status)
 for kind in ["Корм +30", "Вода +30"]:
  var button := Button.new()
  button.text = kind
  button.custom_minimum_size = Vector2(210, 50)
  if kind.begins_with("Корм"): button.pressed.connect(func(): brain.refill_food())
  else: button.pressed.connect(func(): brain.refill_water())
  panel.add_child(button)
func _process(_delta: float) -> void:
 if status != null:
  status.text = "HAMSTER LIFE · 3D ПРОТОТИП\n%s\nСытость %d · Вода %d · Энергия %d\nЗапасы: корм %d · вода %d" % ["Blender GLB" if using_glb else "Временная геометрия — GLB ещё не собран", 100 - brain.hunger, 100 - brain.thirst, 100 - brain.fatigue, brain.food_amount, brain.water_amount]
