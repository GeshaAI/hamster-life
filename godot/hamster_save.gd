extends RefCounted
class_name HamsterSave
## Atomic local save. Offline needs approximation is separate from browser saves.
const SAVE_PATH := "user://hamster_save_v1.json"
const MAX_OFFLINE_SECONDS := 86400.0
static func save_brain(brain: Node) -> bool:
 var payload := {"version": 1, "saved_at_unix": Time.get_unix_time_from_system()}
 for key in ["hunger", "thirst", "fatigue", "food_amount", "water_amount"]:
  var value: Variant = brain.get(key)
  if typeof(value) not in [TYPE_FLOAT, TYPE_INT] or not is_finite(float(value)):
   return false
  payload[key] = clampf(float(value), 0.0, 100.0)
 var file := FileAccess.open(SAVE_PATH + ".tmp", FileAccess.WRITE)
 if file == null: return false
 file.store_string(JSON.stringify(payload))
 file.flush()
 var write_error := file.get_error()
 file.close()
 if write_error != OK: return false
 return DirAccess.rename_absolute(SAVE_PATH + ".tmp", SAVE_PATH) == OK
static func load_brain(brain: Node) -> bool:
 if not FileAccess.file_exists(SAVE_PATH): return false
 var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
 if file == null: return false
 var parsed: Variant = JSON.parse_string(file.get_as_text())
 file.close()
 if typeof(parsed) != TYPE_DICTIONARY: return false
 var data: Dictionary = parsed
 if typeof(data.get("version")) not in [TYPE_INT, TYPE_FLOAT] or data.version != 1: return false
 for key in ["hunger", "thirst", "fatigue", "saved_at_unix"]:
  if not data.has(key) or typeof(data[key]) not in [TYPE_FLOAT, TYPE_INT] or not is_finite(float(data[key])):
   return false
 for key in ["food_amount", "water_amount"]:
  if data.has(key) and (typeof(data[key]) not in [TYPE_FLOAT, TYPE_INT] or not is_finite(float(data[key]))):
   return false
 var elapsed := clampf(Time.get_unix_time_from_system() - float(data.saved_at_unix), 0.0, MAX_OFFLINE_SECONDS)
 # Prototype approximation: needs grow during absence; no hidden scene is run.
 for key in ["hunger", "thirst", "fatigue"]:
  brain.set(key, clampf(float(data[key]) + float(brain.get(key + "_per_second")) * elapsed, 0.0, 100.0))
 for key in ["food_amount", "water_amount"]:
  if data.has(key): brain.set(key, clampf(float(data[key]), 0.0, float(brain.get(key.replace("_amount", "_capacity")))))
 return true
