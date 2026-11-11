extends Node3D
## Exploration goals: a scavenger hunt for artifacts, site discovery and
## achievements (as js/quest.js). Progress is saved to user://progress.json.

signal toast(text: String, seconds: float)
signal changed

const SAVE := "user://progress.json"
const ACHIEVEMENTS := [
	["first", "First find", "You picked up your first artifact."],
	["half", "Collector", "Half of the artifacts recovered."],
	["all", "Curator of Giza", "Every artifact on the plateau recovered!"],
	["kings", "Heart of the mountain", "You reached the King's Chamber on foot."],
	["summit", "Summit", "You stood on top of the Great Pyramid, 139 m above the plateau."],
	["sphinx", "Between the paws", "You stood at the Dream Stele between the paws of the Sphinx."],
	["sites", "Surveyor", "You visited every named site on the plateau."],
	["night", "Under the stars", "You watched the pyramids by starlight."],
	["storm", "Sand in your teeth", "You weathered a sandstorm out in the open."],
	["runner", "Desert runner", "You ran a full kilometre across the sand."],
	["camel", "Ship of the desert", "You rode a camel across the plateau."],
	["show", "Sound & Light", "You watched the evening light show from the Sphinx terrace."],
]

var progress := {"artifacts": [], "sites": [], "ach": []}
var defs: Array = []
var items := []                   # {def, g, spin, light, phase}
var sites: Array = []             # the landmarks to discover
var run_dist := 0.0
var t := 0.0
var persist := true


func setup(artifacts: Array, landmarks: Array, save_progress: bool) -> void:
	defs = artifacts
	sites = landmarks
	persist = save_progress
	if persist and FileAccess.file_exists(SAVE):
		var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE))
		if d is Dictionary:
			for k in progress:
				if d.get(k) is Array: progress[k] = d[k]
	for a in defs:
		if progress["artifacts"].has(a["id"]): continue
		var g := Node3D.new()
		var p: Array = a["pos"]
		g.position = Vector3(p[0], p[1], p[2])
		var spin := _mesh(a["type"])
		g.add_child(spin)
		var light := OmniLight3D.new()
		light.light_color = (spin.material_override as StandardMaterial3D).albedo_color.lightened(0.3)
		light.light_energy = 1.2
		light.omni_range = 7.0
		light.position.y = 0.4
		light.visible = false
		g.add_child(light)
		add_child(g)
		items.append({"def": a, "g": g, "spin": spin, "light": light, "phase": randf() * 7.0})


func _mesh(type: String) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var col := Color("b87333")
	var metal := 0.1
	var rough := 0.45
	match type:
		"scarab":
			var m := SphereMesh.new()
			m.radius = 0.22
			m.height = 0.44
			mi.mesh = m
			mi.scale = Vector3(1, 0.55, 1.3)
			col = Color("1f6b5a")
			metal = 0.4
		"ushabti":
			var m := CapsuleMesh.new()
			m.radius = 0.11
			m.height = 0.6
			mi.mesh = m
			col = Color("2aa198")
		"ring":
			var m := TorusMesh.new()
			m.inner_radius = 0.11
			m.outer_radius = 0.21
			mi.mesh = m
			mi.rotation.x = PI / 2
			col = Color("e0b040")
			metal = 0.9
			rough = 0.25
		"amulet":
			var m := PrismMesh.new()
			m.size = Vector3(0.3, 0.36, 0.12)
			mi.mesh = m
			col = Color("2246c8")
			metal = 0.3
		"jar":
			var m := CylinderMesh.new()
			m.top_radius = 0.12
			m.bottom_radius = 0.2
			m.height = 0.42
			mi.mesh = m
			col = Color("a8613a")
			rough = 0.85
		"fragment":
			var m := BoxMesh.new()
			m.size = Vector3(0.5, 0.26, 0.38)
			mi.mesh = m
			mi.rotation = Vector3(0.3, 0.5, 0.2)
			col = Color("d8cfc0")
			rough = 0.8
		"stele":
			var m := BoxMesh.new()
			m.size = Vector3(0.34, 0.5, 0.08)
			mi.mesh = m
			col = Color("d9b27a")
			rough = 0.8
		_:
			var m := BoxMesh.new()
			m.size = Vector3(0.5, 0.06, 0.08)
			mi.mesh = m
			metal = 0.8
			rough = 0.35
	var mat := StandardMaterial3D.new()
	mat.albedo_color = col
	mat.metallic = metal
	mat.roughness = rough
	mat.emission_enabled = true
	mat.emission = col
	mat.emission_energy_multiplier = 0.9
	mi.material_override = mat
	return mi


func found() -> int: return progress["artifacts"].size()
func total() -> int: return defs.size()
func remaining() -> Array: return items.map(func(i): return i["def"])
func summary() -> String:
	return "Artifacts %d/%d  ·  Sites %d/%d  ·  Achievements %d/%d" % [found(), total(), progress["sites"].size(), sites.size(), progress["ach"].size(), ACHIEVEMENTS.size()]


func achievements_text() -> String:
	var out := ""
	for a in ACHIEVEMENTS:
		out += ("[x] " if progress["ach"].has(a[0]) else "[  ] ") + a[1] + " — " + a[2] + "\n"
	return out


func _save() -> void:
	if not persist: return
	var f := FileAccess.open(SAVE, FileAccess.WRITE)
	if f: f.store_string(JSON.stringify(progress))


func award(id: String) -> void:
	if progress["ach"].has(id): return
	for a in ACHIEVEMENTS:
		if a[0] == id:
			progress["ach"].append(id)
			_save()
			toast.emit("Achievement — %s\n%s" % [a[1], a[2]], 6.0)
			changed.emit()


func _collect(it: Dictionary) -> void:
	it["g"].queue_free()
	items.erase(it)
	progress["artifacts"].append(it["def"]["id"])
	_save()
	toast.emit("Found: %s (%d/%d)\n%s" % [it["def"]["name"], found(), total(), it["def"]["blurb"]], 7.0)
	changed.emit()
	if found() == 1: award("first")
	if found() >= ceili(total() / 2.0): award("half")
	if found() == total(): award("all")


## env: {fly, on_floor, speed, outdoors, night, storm, sphinx, show, riding}
func update(dt: float, p: Vector3, env: Dictionary) -> void:
	t += dt
	for it in items:
		var d: float = it["g"].position.distance_to(p)
		it["light"].visible = d < 45.0
		if d > 60.0: continue
		it["spin"].rotation.y = t * 1.2 + it["phase"]
		it["spin"].position.y = 0.25 + sin(t * 2.0 + it["phase"]) * 0.08
		if d < 2.2 and not env["fly"]:
			_collect(it)
			break
	for lm in sites:
		if progress["sites"].has(lm["name"]): continue
		var q: Vector3 = lm["pos"]
		if Vector2(p.x - q.x, p.z - q.z).length() < lm["radius"] * 0.6:
			progress["sites"].append(lm["name"])
			_save()
			toast.emit("Discovered: %s (%d/%d sites)" % [lm["name"], progress["sites"].size(), sites.size()], 3.5)
			changed.emit()
			if progress["sites"].size() == sites.size(): award("sites")
	if env["fly"]: return
	if p.y > 137.0 and Vector2(p.x, p.z).length() < 14.0: award("summit")
	if p.x > -4.0 and p.x < 9.0 and absf(p.y - 42.5) < 3.0 and p.z > 17.0 and p.z < 25.0: award("kings")
	if env["sphinx"]: award("sphinx")
	if env["night"] and env["outdoors"]: award("night")
	if env["storm"] and env["outdoors"]: award("storm")
	if env["show"]: award("show")
	if env["riding"]: award("camel")
	if env["on_floor"] and env["speed"] > 9.0 and env["outdoors"]:
		run_dist += env["speed"] * dt
		if run_dist > 1000.0: award("runner")
