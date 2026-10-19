extends RefCounted
class_name HamsterSave
## Local, offline JSON save for the prototype. No server or paid API.
const SAVE_PATH := "user://hamster_save_v1.json"
const MAX_OFFLINE_SECONDS := 86400.0
static func save_brain(brain: Node) -> bool:
 var payload := {
  "version": 1,
  "saved_at_unix": Time.get_unix_time_from_system(),
  "hunger": clampf(float(brain.get("hunger")), 0.0, 100.0),
  "thirst": clampf(float(brain.get("thirst")), 0.0, 100.0),
  "fatigue": clampf(float(brain.get("fatigue")), 0.0, 100.0),
  "food_amount": float(brain.get("food_amount")),
  "water_amount": float(brain.get("water_amount"))
 }
 var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
 if file == null:
  push_warning("Cannot open hamster save: " + str(FileAccess.get_open_error()))
  return false
 file.store_string(JSON.stringify(payload))
 file.close()
 return true
static func load_brain(brain: Node) -> bool:
 if not FileAccess.file_exists(SAVE_PATH):
  return false
 var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
 if file == null:
  return false
 var parsed: Variant = JSON.parse_string(file.get_as_text())
 file.close()
 if typeof(parsed) != TYPE_DICTIONARY:
  return false
 var data: Dictionary = parsed
 if int(data.get("version", -1)) != 1:
  return false
 for key in ["hunger", "thirst", "fatigue", "saved_at_unix"]:
  if not data.has(key) or typeof(data[key]) not in [TYPE_FLOAT, TYPE_INT]:
   return false
 var elapsed := clampf(Time.get_unix_time_from_system() - float(data["saved_at_unix"]), 0.0, MAX_OFFLINE_SECONDS)
 brain.set("hunger", clampf(float(data["hunger"]) + float(brain.get("hunger_per_second")) * elapsed, 0.0, 100.0))
 brain.set("thirst", clampf(float(data["thirst"]) + float(brain.get("thirst_per_second")) * elapsed, 0.0, 100.0))
 brain.set("fatigue", clampf(float(data["fatigue"]) + float(brain.get("fatigue_per_second")) * elapsed, 0.0, 100.0))
 if data.has("food_amount"):
  brain.set("food_amount", clampf(float(data["food_amount"]), 0.0, float(brain.get("food_capacity"))))
 if data.has("water_amount"):
  brain.set("water_amount", clampf(float(data["water_amount"]), 0.0, float(brain.get("water_capacity"))))
 return true
