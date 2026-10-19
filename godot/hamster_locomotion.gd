extends Node3D
## Attach to the imported hamster GLB scene root in Godot 4.
## Drives walking locally; the parent gameplay controller owns navigation and needs.
@export var walk_speed: float = 0.55
@export var stride_frequency: float = 7.0
@export var stride_angle: float = 0.24
@export var bob_height: float = 0.018
var movement_direction: Vector3 = Vector3.ZERO
var _phase: float = 0.0
var _rest_y: float
var _paws: Array[Node3D] = []
func _ready() -> void:
 _rest_y = position.y
 for paw_name in ["PawPivot_L_Front", "PawPivot_R_Front", "PawPivot_L_Rear", "PawPivot_R_Rear"]:
  var paw := find_child(paw_name, true, false) as Node3D
  if paw != null:
   _paws.append(paw)
func _process(delta: float) -> void:
 var direction := movement_direction
 direction.y = 0.0
 if direction.length_squared() > 1.0:
  direction = direction.normalized()
 var intensity: float = minf(direction.length(), 1.0)
 if intensity > 0.001:
  _phase += delta * stride_frequency
  position += direction * walk_speed * delta
  var facing := atan2(-direction.x, -direction.z)
  rotation.y = lerp_angle(rotation.y, facing, minf(delta * 9.0, 1.0))
 for i in range(_paws.size()):
  var diagonal: float = 1.0 if i == 0 or i == 3 else -1.0
  _paws[i].rotation.x = sin(_phase * TAU + (0.0 if diagonal > 0.0 else PI)) * stride_angle * intensity
 position.y = _rest_y + absf(sin(_phase * TAU)) * bob_height * intensity
## Game logic sets a planar world-space direction (zero to stop).
func set_move_direction(direction: Vector3) -> void:
 movement_direction = direction
