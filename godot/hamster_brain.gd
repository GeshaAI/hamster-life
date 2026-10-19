extends Node3D
## Autonomous hamster brain for Godot 4. Attach to a parent Node3D containing
## the imported hamster model with hamster_locomotion.gd.
## Place FoodPoint, WaterPoint and BedPoint Marker3D nodes as children of this node.
## This is a standalone prototype, not yet integrated into the main game.
enum State { WANDER, SEEK_FOOD, EAT, SEEK_WATER, DRINK, SEEK_BED, SLEEP }
@export var model: Node3D
@export var food_point: Marker3D
@export var water_point: Marker3D
@export var bed_point: Marker3D
@export var roam_radius: float = 1.3
@export var hunger_per_second: float = 0.45
@export var thirst_per_second: float = 0.65
@export var fatigue_per_second: float = 0.18
@export var recover_per_second: float = 1.7
@export var food_capacity: float = 100.0
@export var water_capacity: float = 100.0
@export var food_consumption_rate: float = 8.0
@export var water_consumption_rate: float = 10.0
var food_amount: float = 70.0
var water_amount: float = 70.0
var hunger: float = 15.0
var thirst: float = 12.0
var fatigue: float = 5.0
var state: State = State.WANDER
var _target: Vector3 = Vector3.ZERO
var _activity_timer: float = 0.0
var _rng := RandomNumberGenerator.new()
var _autosave_elapsed: float = 0.0
const SAVE_INTERVAL_SECONDS := 30.0
func _ready() -> void:
 _rng.randomize()
 HamsterSave.load_brain(self)
 _pick_roam_target()
func _physics_process(delta: float) -> void:
 _autosave_elapsed += delta
 if _autosave_elapsed >= SAVE_INTERVAL_SECONDS:
  _autosave_elapsed = 0.0
  HamsterSave.save_brain(self)
 hunger = clampf(hunger + hunger_per_second * delta, 0.0, 100.0)
 thirst = clampf(thirst + thirst_per_second * delta, 0.0, 100.0)
 if state != State.SLEEP:
  fatigue = clampf(fatigue + fatigue_per_second * delta, 0.0, 100.0)
 _activity_timer = maxf(0.0, _activity_timer - delta)
 match state:
  State.WANDER:
   if thirst >= 65.0 and water_amount > 0.0 and water_point != null:
    _seek(State.SEEK_WATER, water_point.global_position)
   elif hunger >= 65.0 and food_amount > 0.0 and food_point != null:
    _seek(State.SEEK_FOOD, food_point.global_position)
   elif fatigue >= 70.0 and bed_point != null:
    _seek(State.SEEK_BED, bed_point.global_position)
   elif _arrived():
    _pick_roam_target()
  State.SEEK_FOOD, State.SEEK_WATER, State.SEEK_BED:
   if _arrived():
    _activity_timer = 3.0 if state != State.SEEK_BED else 8.0
    if state == State.SEEK_FOOD: state = State.EAT if food_amount > 0.0 else State.WANDER
    elif state == State.SEEK_WATER: state = State.DRINK if water_amount > 0.0 else State.WANDER
    else: state = State.SLEEP
  State.EAT:
   hunger = maxf(0.0, hunger - 22.0 * delta)
   if _activity_timer <= 0.0: _resume()
  State.DRINK:
   thirst = maxf(0.0, thirst - 30.0 * delta)
   if _activity_timer <= 0.0: _resume()
  State.SLEEP:
   fatigue = maxf(0.0, fatigue - recover_per_second * 6.0 * delta)
   if _activity_timer <= 0.0: _resume()
 if model != null and model.has_method("set_move_direction"):
  var direction := Vector3.ZERO
  if state in [State.WANDER, State.SEEK_FOOD, State.SEEK_WATER, State.SEEK_BED]:
   direction = _target - model.global_position
   direction.y = 0.0
   if direction.length() > 0.09:
    direction = direction.normalized()
   else:
    direction = Vector3.ZERO
  model.set_move_direction(direction)
func _arrived() -> bool:
 if model == null: return true
 var distance := model.global_position.distance_to(Vector3(_target.x, model.global_position.y, _target.z))
 return distance <= 0.12
func _seek(next_state: State, point: Vector3) -> void:
 state = next_state
 _target = point
func _resume() -> void:
 state = State.WANDER
 _pick_roam_target()
func _pick_roam_target() -> void:
 var angle := _rng.randf_range(0.0, TAU)
 var radius := sqrt(_rng.randf()) * maxf(roam_radius, 0.1)
 _target = global_position + Vector3(cos(angle) * radius, 0.0, sin(angle) * radius)

func _notification(what: int) -> void:
 if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
  HamsterSave.save_brain(self)

func refill_food(amount: float = 30.0) -> void:
 food_amount = clampf(food_amount + maxf(amount, 0.0), 0.0, food_capacity)
 HamsterSave.save_brain(self)

func refill_water(amount: float = 30.0) -> void:
 water_amount = clampf(water_amount + maxf(amount, 0.0), 0.0, water_capacity)
 HamsterSave.save_brain(self)
