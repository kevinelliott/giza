extends Node3D
## Giza Plateau — native build.
## The open plateau (res://models/plateau.glb, exported from the same code that
## builds the web version: terrain, pyramids, Sphinx, temples, tombs, town)
## plus the Blender-built interiors (Great Pyramid upper chambers, Menkaure's
## substructure, the tomb of Meresankh III, the Serapeum), with sky and sun,
## first-person walking, fast travel and site captions.
##
## Model conventions (tools/blender/gizalib.py, tools/export_plateau.mjs):
## material names pick the surface; plateau nodes end in __col (solid) or
## __vis; empties named insc_<key> / tex_<key> are wall panels, poi_<key>
## points of interest, tp_<key> / spawn fast-travel points.

const STONE := preload("res://scripts/stone.gdshader")
const GROUND := preload("res://scripts/ground.gdshader")
const COURSE := preload("res://scripts/course.gdshader")
const VCOL := preload("res://scripts/vcol.gdshader")
const TOWN := preload("res://scripts/town.gdshader")
const WATER := preload("res://scripts/water.gdshader")
const DESERT := preload("res://scripts/desert.gdshader")
const Player := preload("res://scripts/player.gd")
const Life := preload("res://scripts/life.gd")
const Quest := preload("res://scripts/quest.gd")
const Map := preload("res://scripts/map.gd")
const Traffic := preload("res://scripts/traffic.gd")
const River := preload("res://scripts/river.gd")

# Blender interiors: material name -> [colour, roughness, bake gain, strata, joint height, joint width]
const BAKED := {
	"rock": [Color("b9aa8c"), 0.97, 0.5, 1.0, 0.0, 1.0],
	"masonry": [Color("a39a86"), 0.95, 0.5, 0.6, 0.52, 1.05],
	"limestone": [Color("8f8470"), 0.9, 1.1, 0.4, 0.86, 1.6],
	"granite": [Color("8a6458"), 0.55, 1.6, 0.3, 1.17, 2.2],
	"granite_dark": [Color("4a3830"), 0.5, 1.7, 0.2, 0.0, 1.0],
	"granite_black": [Color("2c2c30"), 0.22, 1.3, 1.0, 0.0, 1.0],
	"granite_red": [Color("b58d82"), 0.42, 1.1, 1.0, 0.0, 1.0],
	"granite_grey": [Color("6d6d70"), 0.34, 1.2, 1.0, 0.0, 1.0],
	"plaster": [Color("8c8068"), 0.97, 1.1, 0.6, 0.0, 1.0],
	"ceiling_red": [Color("a8685e"), 0.95, 1.1, 0.6, 0.0, 1.0],
	"statue": [Color("8a8070"), 0.97, 1.2, 0.5, 0.0, 1.0],
	"wood": [Color("6e4a2a"), 0.8, 1.0, 1.0, 0.0, 1.0],
	"paint_yellow": [Color("b8862a"), 0.9, 1.1, 0.25, 0.0, 1.0],
	"quartzite": [Color("8a6a44"), 0.6, 1.2, 0.5, 0.0, 1.0],
}
# The plateau, lit by the sun: same shader, no baked light.
const OUTDOOR := {
	"limestone": [Color("b79a68"), 0.93, 0.0, 0.5, 1.1, 1.25],
	"bedrock": [Color("b89c68"), 0.95, 0.0, 0.7, 1.33, 1.33],
	"casing": [Color("d3c6a2"), 0.6, 0.0, 0.2, 0.9, 1.5],
	"granite": [Color("8b5a4d"), 0.55, 0.0, 0.3, 1.2, 2.0],
	"granite_band": [Color("9c6656"), 0.8, 0.0, 0.4, 1.3, 2.2],
	"interior": [Color("a89a7c"), 0.95, 0.0, 0.5, 1.0, 1.15],
	"interiorGranite": [Color("8a6458"), 0.55, 0.0, 0.3, 1.2, 2.0],
	"courseTop": [Color("c9b690"), 1.0, 0.0, 1.0, 0.0, 1.0],
	"plaster": [Color("ddd5c4"), 0.9, 0.0, 0.2, 0.0, 1.0],
	"wood": [Color("6b4a2b"), 0.85, 0.0, 0.6, 0.0, 1.0],
}
const PHOTOS := ["belzoni", "kv62_north", "kv62_west", "kv62_east", "kv62_south", "kv62_sign", "dream_stele", "mer_pillar", "mer_wpillar", "mer_north", "mer_east", "mer_west", "mer_kawab", "mer_jamb", "mer_list"]
const HOURS := [9.5, 12.0, 16.0, 18.4, 21.5, 6.2]
const LAT := 29.98

var baked := {}
var outdoor := {}
var insc_index: Array = []
var travel := []          # [{label, pos, look?}]
var pois := []            # [{name, blurb, radius, pos}]
var zones: Array[AABB] = []   # the Blender interiors (pre-lit)
var open_places: Array[AABB] = []   # sunlit places away from the plateau (Luxor, ...)
var far_roots := []            # [[AABB, Node3D]]: models beyond the plateau, shown only while the player is near
var world := {}
var world_box := AABB(Vector3(-1500, -200, -700), Vector3(2600, 600, 2200))
var heights := PackedFloat32Array()
var player: CharacterBody3D
var env: Environment
var sun: DirectionalLight3D
var sky_mat: ProceduralSkyMaterial
var town_mat: ShaderMaterial
var hour_i := 0
var hour := 9.5
var sun_energy := 1.0
var walk_min_open := 1.0
var inside_k := 0.0
var lamp_user := false
var hud_site: Label
var hud_blurb: Label
var hud_pos: Label
var menu: ItemList
var shot_path := ""
var shot_at := ""
var shot_look := ""
var frames := 0
var life: Node3D
var traffic: Node3D
var rivers: Array = []
var quest: Node3D
var minimap: Control
var fullmap: Control
var hud_toast: Label
var hud_quest: Label
var toasts := []              # [[text, seconds]]
var toast_left := 0.0
var riding: Node3D = null
var hint_camel: Node3D = null
var storm := false
var storm_k := 0.0
var fog_base := Color(0.84, 0.78, 0.65)
var day_k := 1.0
var shot_keys := ""
var walk_from := Vector3.INF
var walk_t := 0.0
var walk_secs := 9.0
var walk_path: Array[Vector2] = []
var walk_i := 0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="): shot_path = a.substr(7)
		if a.begins_with("--at="): shot_at = a.substr(5)
		if a.begins_with("--look="): shot_look = a.substr(7)
		if a.begins_with("--hour="): hour = float(a.substr(7))
		if a.begins_with("--do="): shot_keys = a.substr(5)
		if a.begins_with("--secs="): walk_secs = float(a.substr(7))
		if a.begins_with("--path="):
			for q in a.substr(7).split(";"): walk_path.append(Vector2(float(q.split(",")[0]), float(q.split(",")[1])))
	world = JSON.parse_string(FileAccess.get_file_as_string("res://data/world.json"))
	heights = FileAccess.get_file_as_bytes("res://data/terrain.bin").to_float32_array()
	# terrain.bin is not a Godot resource, so it is only in an exported build if export_presets.cfg
	# lists it. When it was missing, every ground height read garbage: people stood in mid-air and
	# daylight cut out at random. Refuse to run like that.
	if heights.size() != int(world["grid"]["nx"]) * int(world["grid"]["nz"]):
		push_error("data/terrain.bin is missing or the wrong size (%d values): the build is incomplete" % heights.size())
		OS.alert("This copy of the game is incomplete (terrain data is missing). Please download it again.", "Giza Plateau")
		get_tree().quit(1)
		return
	insc_index = JSON.parse_string(FileAccess.get_file_as_string("res://data/inscriptions.json"))
	_environment()
	_materials()
	_place_plateau()
	for t in world["teleports"]:
		var p: Array = t["pos"]
		travel.append({"label": t["label"], "pos": Vector3(p[0], p[1], p[2])})
	for l in world["landmarks"]:
		var q: Array = l["pos"]
		pois.append({"name": l["name"], "blurb": l["blurb"], "radius": float(l["radius"]), "pos": Vector3(q[0], q[1], q[2])})
	var sites: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/sites.json"))
	for m in sites["models"]:
		_place_model(m)
	player = Player.new()
	add_child(player)
	life = Life.new()
	add_child(life)
	life.setup(self, world)
	traffic = Traffic.new()
	add_child(traffic)
	traffic.setup(self, world)
	quest = Quest.new()
	add_child(quest)
	quest.setup(world["artifacts"], pois.slice(0, world["landmarks"].size()), shot_path == "")
	quest.toast.connect(toast)
	quest.changed.connect(func(): hud_quest.text = quest.summary())
	_hud()
	var start := 0
	for i in travel.size():
		if shot_at != "" and travel[i]["label"].to_lower().contains(shot_at.to_lower()):
			start = i
			break
	_go(start)
	if start == 0:
		player.face_pending = 0
		player.look_at_point(Vector3(-94, 30, 84))        # Khufu and Khafre from the overlook
	if shot_look != "":
		var c := shot_look.split(",")
		if c.size() == 6:
			player.fly = not shot_keys.contains("walk")
			player.face_pending = 0
			player.teleport(Vector3(float(c[0]), float(c[1]), float(c[2])))
			player.look_at_point(Vector3(float(c[3]), float(c[4]), float(c[5])))
	_apply_time()
	if shot_path == "": Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


# ---- sky, sun, time of day ---------------------------------------------------
func _environment() -> void:
	env = Environment.new()
	sky_mat = ProceduralSkyMaterial.new()
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 0.35
	env.ambient_light_color = Color(0.78, 0.72, 0.62)
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.85
	env.tonemap_white = 5.0
	env.glow_enabled = true
	env.glow_intensity = 0.3
	env.glow_bloom = 0.03
	env.fog_enabled = true
	env.fog_density = 0.00018
	env.fog_aerial_perspective = 0.6
	env.fog_sky_affect = 0.0
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	# The nearest split ends at 25 m, so a figure's shadow is sharp and starts at the feet; with the
	# default splits of a 600 m range it was soft enough that people seemed to hover.
	sun.directional_shadow_max_distance = 450.0
	sun.directional_shadow_split_1 = 0.055
	sun.directional_shadow_split_2 = 0.2
	sun.directional_shadow_split_3 = 0.5
	sun.directional_shadow_blend_splits = true
	sun.shadow_bias = 0.03
	sun.shadow_normal_bias = 1.0
	sun.shadow_blur = 0.6
	add_child(sun)


func _sun_dir(h: float) -> Vector3:
	# Sun for Giza at an equinox-ish declination of +10 deg (as in the web build)
	var dec := deg_to_rad(10.0)
	var lat := deg_to_rad(LAT)
	var ha := deg_to_rad((h - 12.0) * 15.0)
	var sin_el := sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(ha)
	var el := asin(sin_el)
	var az := atan2(-sin(ha) * cos(dec), sin(dec) * cos(lat) - cos(dec) * sin(lat) * cos(ha))   # from north, clockwise
	return Vector3(sin(az) * cos(el), sin(el), -cos(az) * cos(el))


func _apply_time() -> void:
	var d := _sun_dir(hour)
	var el := rad_to_deg(asin(d.y))
	var day := smoothstep(-4.0, 8.0, el)
	var warm := 1.0 - smoothstep(0.0, 26.0, el)
	var night := 1.0 - smoothstep(-10.0, -1.0, el)
	var ld := d if el > 0.5 else Vector3(-d.x, maxf(0.35, -d.y), -d.z).normalized()     # after dusk: a dim moon opposite
	sun.look_at_from_position(ld * 100.0, Vector3.ZERO, Vector3.UP)
	sun.light_color = Color(1.0, 0.96, 0.88).lerp(Color(1.0, 0.62, 0.36), warm * 0.8) if el > 0.5 else Color(0.55, 0.65, 1.0)
	sun_energy = (0.2 + 0.95 * smoothstep(0.0, 30.0, el)) if el > 0.5 else 0.22
	sky_mat.sky_top_color = Color(0.20, 0.38, 0.68).lerp(Color(0.03, 0.045, 0.1), 1.0 - day)
	sky_mat.sky_horizon_color = Color(0.72, 0.78, 0.84).lerp(Color(0.95, 0.62, 0.38), warm * day).lerp(Color(0.05, 0.065, 0.11), 1.0 - day)
	sky_mat.ground_horizon_color = sky_mat.sky_horizon_color
	sky_mat.ground_bottom_color = Color(0.66, 0.62, 0.52).lerp(Color(0.02, 0.02, 0.03), 1.0 - day)
	sky_mat.sun_angle_max = 6.0
	day_k = day
	fog_base = Color(0.84, 0.78, 0.65).lerp(Color(0.95, 0.66, 0.42), warm * day).lerp(Color(0.02, 0.03, 0.05), 1.0 - day)
	if town_mat: town_mat.set_shader_parameter("night", clampf((4.0 - el) / 8.0, 0.0, 1.0))
	set_meta("night", night)


# ---- materials -----------------------------------------------------------
func _stone(v: Array) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = STONE
	m.set_shader_parameter("base_color", v[0])
	m.set_shader_parameter("roughness_value", v[1])
	m.set_shader_parameter("bake_gain", v[2])
	m.set_shader_parameter("strata", v[3])
	m.set_shader_parameter("joint_h", v[4])
	m.set_shader_parameter("joint_w", v[5])
	return m


func _materials() -> void:
	for k in BAKED: baked[k] = _stone(BAKED[k])
	for k in OUTDOOR: outdoor[k] = _stone(OUTDOOR[k])
	var fx := StandardMaterial3D.new()
	fx.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	fx.albedo_color = Color(1.0, 0.94, 0.8)
	fx.emission_enabled = true
	fx.emission = Color(1.0, 0.92, 0.75)
	fx.emission_energy_multiplier = 2.5
	baked["fixture"] = fx
	var dark := StandardMaterial3D.new()
	dark.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	dark.albedo_color = Color(0.03, 0.025, 0.02)
	baked["dark"] = dark
	var glass := StandardMaterial3D.new()
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass.albedo_color = Color(0.75, 0.88, 0.9, 0.16)
	glass.roughness = 0.05
	glass.cull_mode = BaseMaterial3D.CULL_DISABLED
	baked["glass"] = glass
	var g := ShaderMaterial.new()
	g.shader = GROUND
	g.set_shader_parameter("ground_tex", load("res://textures/ground.jpg"))
	g.set_shader_parameter("roads_tex", load("res://textures/roads.png"))
	var e: Dictionary = world["extent"]
	g.set_shader_parameter("extent", Vector4(e["x0"], e["z0"], e["x1"] - e["x0"], e["z1"] - e["z0"]))
	outdoor["sand"] = g
	var c := ShaderMaterial.new()
	c.shader = COURSE
	outdoor["course"] = c
	for k in ["sphinx", "rock", "vcol"]:
		var vm := ShaderMaterial.new()
		vm.shader = VCOL
		if k == "sphinx": vm.set_shader_parameter("tint", 0.72)
		if k == "vcol":
			vm.set_shader_parameter("roughness_value", 0.4)
			vm.set_shader_parameter("grain", 0.0)
		outdoor[k] = vm
	town_mat = ShaderMaterial.new()
	town_mat.shader = TOWN
	outdoor["town"] = town_mat
	var wm := ShaderMaterial.new()
	wm.shader = WATER
	outdoor["water"] = wm
	for k in [["desert", Color("cdb085"), Color("b89a70")], ["theban", Color("c4a67e"), Color("b08a60")], ["silt", Color("6f6a4c"), Color("5f5a44")]]:
		var dm := ShaderMaterial.new()
		dm.shader = DESERT
		dm.set_shader_parameter("sand_color", k[1])
		dm.set_shader_parameter("rock_color", k[2])
		outdoor[k[0]] = dm


func _outdoor_material(nm: String) -> Material:
	if outdoor.has(nm): return outdoor[nm]
	var m := StandardMaterial3D.new()
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.9
	if nm.begins_with("c_"):
		m.albedo_color = Color(nm.substr(2, 6)).darkened(0.12)
		if nm.ends_with("_t"):
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			m.albedo_color.a = 0.55
	outdoor[nm] = m
	return m


# ---- the plateau -----------------------------------------------------------
func _place_plateau() -> void:
	var scene: PackedScene = load("res://models/plateau.glb")
	if scene == null: return
	var root: Node3D = scene.instantiate()
	root.name = "plateau"
	add_child(root)
	for n in _walk(root):
		if n is MeshInstance3D:
			var mi: MeshInstance3D = n
			var src := mi.mesh.surface_get_material(0)
			var nm := src.resource_name if src != null else "limestone"
			mi.set_surface_override_material(0, _outdoor_material(nm))
			if String(mi.name).ends_with("__col"): mi.create_trimesh_collision()
		# (Godot's importer reads the "_col" suffix itself and builds the static bodies.)
		# The web build's floors are thin, two-sided sheets: collide with both sides here too.
		if n is CollisionShape3D and (n as CollisionShape3D).shape is ConcavePolygonShape3D:
			((n as CollisionShape3D).shape as ConcavePolygonShape3D).backface_collision = true


func terrain_height(x: float, z: float) -> float:
	var g: Dictionary = world["grid"]
	var nx := int(g["nx"])
	var fx := clampf((x - float(g["x0"])) / float(g["step"]), 0.0, nx - 1.001)
	var fz := clampf((z - float(g["z0"])) / float(g["step"]), 0.0, int(g["nz"]) - 1.001)
	var i := int(fx)
	var j := int(fz)
	var u := fx - i
	var v := fz - j
	var k := j * nx + i
	var h00 := heights[k]
	var h10 := heights[k + 1]
	var h01 := heights[k + nx]
	var h11 := heights[k + nx + 1]
	if v >= u: return h00 + v * (h01 - h00) + u * (h11 - h01)
	return h00 + u * (h10 - h00) + v * (h11 - h10)


## Is there anything overhead? The interiors' bounding boxes and the pyramids'
## envelopes take in open ground too (the foot of the Great Pyramid's entrance
## stair, the pavement north of Khafre, the open stair of KV62), so "indoors"
## also needs a roof: without this the sun and sky went out as you walked there.
func _roofed(p: Vector3) -> bool:
	var rq := PhysicsRayQueryParameters3D.create(p + Vector3(0, 0.6, 0), p + Vector3(0, 160.0, 0))
	rq.exclude = [player.get_rid()]
	rq.hit_back_faces = true
	rq.hit_from_inside = false
	return not get_world_3d().direct_space_state.intersect_ray(rq).is_empty()


func _is_inside(p: Vector3) -> bool:
	var enclosed := false
	for z in zones:
		if z.has_point(p): enclosed = true
	if not enclosed:
		for op in open_places:
			if op.has_point(p): return false
		for py in world["pyramids"]:
			var y := p.y - float(py["baseY"])
			var w: float = float(py["base"]) / 2.0 * (1.0 - maxf(0.0, y) / float(py["height"])) - 1.2
			if absf(p.x - float(py["x"])) < w and absf(p.z - float(py["z"])) < w: enclosed = true
		if p.y < terrain_height(p.x, p.z) - 1.2: enclosed = true
	return enclosed and _roofed(p)


# ---- the Blender interiors ---------------------------------------------------
func _place_model(m: Dictionary) -> void:
	var scene: PackedScene = load("res://models/" + m["file"])
	if scene == null:
		push_warning("missing model " + str(m["file"]))
		return
	var root: Node3D = scene.instantiate()
	root.name = m["id"]
	var p: Array = m["position"]
	root.position = Vector3(p[0], p[1], p[2])
	add_child(root)
	var anchors := {}
	var box := AABB()
	var first := true
	var open_air: bool = m.get("outdoor", false)       # a sunlit place (not a pre-lit interior)
	for n in _walk(root):
		var nm := String(n.name)
		if n is MeshInstance3D and open_air:
			var omi: MeshInstance3D = n
			var solid := false
			var ob: AABB = omi.global_transform * omi.get_aabb()
			box = ob if first else box.merge(ob)
			first = false
			for si in omi.mesh.get_surface_count():
				var src := omi.mesh.surface_get_material(si)
				var mn := src.resource_name if src != null else "limestone"
				omi.set_surface_override_material(si, _outdoor_material(mn))
				if mn != "water": solid = true
			if (solid and not _is_deco(omi)) or nm.begins_with("riverbed"): omi.create_trimesh_collision()
			for body in omi.get_children():
				for cs in body.get_children():
					if cs is CollisionShape3D and cs.shape is ConcavePolygonShape3D: cs.shape.backface_collision = true
		elif n is MeshInstance3D:
			_dress(n)
			var b: AABB = (n as MeshInstance3D).global_transform * (n as MeshInstance3D).get_aabb()
			box = b if first else box.merge(b)
			first = false
		elif nm.begins_with("insc_") or nm.begins_with("tex_"):
			_panel(n)
		elif nm.begins_with("poi_") or nm.begins_with("tp_") or nm == "spawn":
			anchors[nm] = (n as Node3D).global_position
	if open_air or not world_box.grow(200.0).intersects(box): far_roots.append([box.grow(1800.0), root])
	if m.get("river", false):
		var rv := River.new()
		add_child(rv)
		rv.setup(self, root)
		rivers.append(rv)
	if not open_air: zones.append(box.grow(0.5))
	else: open_places.append(box.grow(60.0))
	for k in anchors:
		if k.begins_with("tp_") or k == "spawn":
			var label: String = m["title"]
			if k != "spawn": label += " — " + k.substr(3).replace("_", " ")
			travel.append({"label": label, "pos": anchors[k]})
	for q in m["pois"]:
		var key := "poi_" + String(q["key"])
		if anchors.has(key):
			pois.append({"name": q["name"], "blurb": q["blurb"], "radius": float(q["radius"]), "pos": anchors[key]})


func _walk(n: Node) -> Array:
	var out := [n]
	for c in n.get_children(): out.append_array(_walk(c))
	return out


func _is_deco(n: Node) -> bool:
	var o := n
	while o != null:
		if String(o.name).begins_with("deco"): return true
		o = o.get_parent()
	return false


func _dress(mi: MeshInstance3D) -> void:
	var solid := false
	var steps := String(mi.name).begins_with("steps") or String(mi.get_parent().name).begins_with("steps")
	for s in mi.mesh.get_surface_count():
		var src := mi.mesh.surface_get_material(s)
		var nm := src.resource_name if src != null else "rock"
		if steps: nm = "rock"
		mi.set_surface_override_material(s, baked.get(nm, baked["rock"]))
		if not nm.begins_with("fixture") and nm != "dark" and nm != "glass": solid = true
	if String(mi.name).begins_with("fixture"): solid = false          # lamp fittings never block the way
	if String(mi.name).begins_with("col_"):                          # collision-only helpers (unseen)
		mi.create_trimesh_collision()
		for body in mi.get_children():
			for cs in body.get_children():
				if cs is CollisionShape3D and cs.shape is ConcavePolygonShape3D: cs.shape.backface_collision = true
		mi.visible = false
		return
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if solid and not _is_deco(mi):
		mi.create_trimesh_collision()


func _panel(e: Node3D) -> void:
	var nm := String(e.name)
	var photo := nm.begins_with("tex_")
	var key := nm.substr(4 if photo else 5)
	var path := ""
	if photo:
		var best_len := 0
		for k in PHOTOS:
			if key.begins_with(k) and k.length() > best_len:
				for ext in ["jpg", "png"]:
					if ResourceLoader.exists("res://textures/%s.%s" % [k, ext]):
						path = "res://textures/%s.%s" % [k, ext]
						best_len = k.length()
	else:
		var sc := e.scale
		var best := 0
		for base in insc_index:
			var stem: String = base.substr(0, base.rfind("_"))
			if key.begins_with(stem) and stem.length() > best and base.ends_with("%dx%d" % [roundi(sc.x * 100), roundi(sc.z * 100)]):
				best = stem.length()
				path = "res://textures/insc/" + base + ".png"
	if path == "" or not ResourceLoader.exists(path): return
	var quad := MeshInstance3D.new()
	var qm := QuadMesh.new()
	qm.size = Vector2(1, 1)
	quad.mesh = qm
	quad.rotation.x = -PI / 2
	quad.position.y = 0.004
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = load(path)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.roughness = 0.8
	mat.emission_enabled = true
	mat.emission_texture = mat.albedo_texture
	mat.emission_energy_multiplier = 0.35 if photo else 0.15
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	quad.material_override = mat
	quad.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	e.add_child(quad)


# ---- HUD, travel, input -----------------------------------------------------
func _hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	hud_site = Label.new()
	hud_site.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	hud_site.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	hud_site.grow_vertical = Control.GROW_DIRECTION_BEGIN
	hud_site.position += Vector2(-24, -120)
	hud_site.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hud_site.add_theme_font_size_override("font_size", 24)
	hud_site.add_theme_color_override("font_color", Color("ffd98a"))
	hud_site.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	layer.add_child(hud_site)
	hud_blurb = Label.new()
	hud_blurb.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	hud_blurb.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	hud_blurb.grow_vertical = Control.GROW_DIRECTION_BEGIN
	hud_blurb.position += Vector2(-24, -24)
	hud_blurb.custom_minimum_size = Vector2(520, 0)
	hud_blurb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_blurb.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hud_blurb.add_theme_font_size_override("font_size", 15)
	hud_blurb.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	layer.add_child(hud_blurb)
	var hint := Label.new()
	hint.position = Vector2(16, 12)
	hint.add_theme_font_size_override("font_size", 14)
	hint.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	hint.modulate = Color(1, 1, 1, 0.8)
	hint.text = "WASD move · mouse look · C crouch · Shift run · Space jump · F fly · L lamp · E ride a camel\nT time of day · K sandstorm · M map · Tab travel list · O / - / = minimap · Esc release mouse"
	layer.add_child(hint)
	hud_pos = Label.new()
	hud_pos.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	hud_pos.grow_vertical = Control.GROW_DIRECTION_BEGIN
	hud_pos.position += Vector2(16, -16)
	hud_pos.add_theme_font_size_override("font_size", 14)
	hud_pos.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	layer.add_child(hud_pos)
	hud_quest = Label.new()
	hud_quest.position = Vector2(16, 54)
	hud_quest.add_theme_font_size_override("font_size", 14)
	hud_quest.add_theme_color_override("font_color", Color("ffd98a"))
	hud_quest.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	hud_quest.text = quest.summary()
	layer.add_child(hud_quest)
	hud_toast = Label.new()
	hud_toast.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	hud_toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
	hud_toast.position.y = 84
	hud_toast.custom_minimum_size = Vector2(620, 0)
	hud_toast.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hud_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hud_toast.add_theme_font_size_override("font_size", 17)
	hud_toast.add_theme_color_override("font_color", Color("fff1cf"))
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.06, 0.03, 0.78)
	sb.set_corner_radius_all(8)
	sb.set_content_margin_all(12)
	hud_toast.add_theme_stylebox_override("normal", sb)
	hud_toast.visible = false
	layer.add_child(hud_toast)
	minimap = Map.new()
	minimap.setup(world, travel, quest, player, false)
	minimap.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	minimap.custom_minimum_size = Vector2(200, 200)
	minimap.size = Vector2(200, 200)
	minimap.position = Vector2(-216, 16)
	layer.add_child(minimap)
	fullmap = Map.new()
	fullmap.setup(world, travel, quest, player, true)
	fullmap.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fullmap.visible = false
	fullmap.travel.connect(func(i): _go(i); _toggle_map())
	layer.add_child(fullmap)
	menu = ItemList.new()
	menu.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	menu.custom_minimum_size = Vector2(640, 560)
	menu.position -= Vector2(320, 280)
	menu.visible = false
	for t in travel: menu.add_item(t["label"])
	menu.item_activated.connect(func(i): _go(i); _toggle_menu())
	layer.add_child(menu)


func _toggle_menu() -> void:
	menu.visible = not menu.visible
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if menu.visible else Input.MOUSE_MODE_CAPTURED
	player.frozen = menu.visible
	if menu.visible: menu.grab_focus()


func _toggle_map() -> void:
	if menu.visible: _toggle_menu()
	fullmap.visible = not fullmap.visible
	minimap.visible = not fullmap.visible
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if fullmap.visible else Input.MOUSE_MODE_CAPTURED
	player.frozen = fullmap.visible
	if fullmap.visible: fullmap.centre = Vector2(clampf(player.global_position.x, -1400, 1000), clampf(player.global_position.z, -600, 1400))


func toast(text: String, seconds := 3.0) -> void:
	toasts.append([text, seconds])


func _go(i: int) -> void:
	if riding: _dismount()
	player.fly = false
	# face the open side; outdoors, lean towards the nearest big thing
	var p: Vector3 = travel[i]["pos"]
	var hint := p
	var bd := 1e9
	for py in world["pyramids"]:
		var c := Vector3(float(py["x"]), p.y, float(py["z"]))
		if p.distance_to(c) < bd:
			bd = p.distance_to(c)
			hint = c
	for q in pois:
		var d: float = p.distance_to(q["pos"])
		if d > 4.0 and d < bd and d < q["radius"]:
			bd = d
			hint = q["pos"]
	player.teleport(p, true, hint)


# ---- boats: E beside a boat you can board takes a trip on the river; E again goes ashore -------------
func _boat_use() -> bool:
	for rv in rivers:
		if not rv.riding.is_empty():
			rv.leave()
			return true
		var b = rv.nearest_boardable(player.global_position)
		if b != null:
			rv.board(b)
			toast("Casting off — a turn on the river. E to go ashore.", 3.5)
			return true
	return false


# ---- camel riding: walk up to a saddled camel and press E ------------------------
func _nearest_camel() -> Node3D:
	var best: Node3D = null
	var bd := 4.2
	var p := player.global_position
	for c in life.rideables:
		var d := Vector2(c.position.x - p.x, c.position.z - p.z).length()
		if d < bd and absf(c.position.y - p.y) < 3.0:
			bd = d
			best = c
	return best


func _mount(c: Node3D) -> void:
	riding = c
	player.fly = false
	life.set_solid(c, false)
	player.teleport(c.position + Vector3(0, 0.3, 0))
	player.speed_mul = 1.45
	player.eye_extra = 1.45
	toast("Up you go! Walk to amble, Shift to trot — E to get down.", 3.2)


func _dismount() -> void:
	var c := riding
	riding = null
	player.speed_mul = 1.0
	player.eye_extra = 0.0
	var th := c.rotation.y
	var x := c.position.x + sin(th) * 1.6
	var z := c.position.z + cos(th) * 1.6
	player.teleport(Vector3(x, terrain_height(x, z) + 0.5, z))
	life.animate_camel(c, 0.0, 0.0)
	life.set_solid(c, true)


func _update_ride(dt: float) -> void:
	if riding:
		var want: float = player.yaw + PI / 2          # the camel faces +X, the player -Z
		riding.rotation.y = lerp_angle(riding.rotation.y, want, minf(1.0, dt * 4.0))
		var th := riding.rotation.y
		var x := player.global_position.x + cos(th) * 0.1
		var z := player.global_position.z - sin(th) * 0.1
		riding.position = Vector3(x, terrain_height(x, z), z)
		life.animate_camel(riding, life.t, Vector2(player.velocity.x, player.velocity.z).length() * 0.45)
		return
	var c: Node3D = null if player.fly else _nearest_camel()
	if c != null and c != hint_camel: toast("A saddled camel — press E to ride", 2.2)
	hint_camel = c


func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("travel_menu"):
		if fullmap.visible: _toggle_map()
		_toggle_menu()
	elif ev.is_action_pressed("map"): _toggle_map()
	elif ev.is_action_pressed("use") and _boat_use():
		pass
	elif ev.is_action_pressed("use"):
		if riding: _dismount()
		elif not player.fly and _nearest_camel() != null: _mount(_nearest_camel())
	elif ev.is_action_pressed("storm"):
		storm = not storm
		toast("A sandstorm is rolling in…" if storm else "The storm is passing.", 2.5)
	elif ev.is_action_pressed("map_orient"): minimap.heading_up = not minimap.heading_up
	elif ev.is_action_pressed("map_zoom_in"): minimap.zoom(1.25)
	elif ev.is_action_pressed("map_zoom_out"): minimap.zoom(0.8)
	elif ev.is_action_pressed("toggle_lamp"): lamp_user = not lamp_user
	elif ev.is_action_pressed("time_of_day"):
		hour_i = (hour_i + 1) % HOURS.size()
		hour = HOURS[hour_i]
		_apply_time()
	elif ev.is_action_pressed("ui_cancel"):
		if menu.visible: _toggle_menu()
		elif fullmap.visible: _toggle_map()
		else: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif ev is InputEventMouseButton and ev.pressed and not menu.visible and not fullmap.visible:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _process(dt: float) -> void:
	var p := player.global_position
	# indoors the sun and sky are shut out; the rooms carry their own (baked) light
	var inside := _is_inside(p + Vector3(0, 1.0, 0))
	inside_k = move_toward(inside_k, 1.0 if inside else 0.0, dt * 3.0)
	storm_k = move_toward(storm_k, 1.0 if storm else 0.0, dt * 0.25)
	var open := 1.0 - inside_k
	sun.light_energy = sun_energy * open * (1.0 - 0.8 * storm_k)
	env.ambient_light_energy = lerpf(0.7, 0.0, inside_k)
	env.background_energy_multiplier = open
	env.fog_density = (0.00018 + 0.016 * storm_k * storm_k) * open
	env.fog_sky_affect = storm_k
	env.fog_aerial_perspective = 0.6 * (1.0 - storm_k)
	env.fog_light_color = fog_base.lerp(fog_base.lerp(Color(0.72, 0.56, 0.36), 0.85) * (0.25 + 0.75 * day_k), storm_k)
	var in_zone := false
	for z in zones:
		if z.has_point(p): in_zone = true
	var night: float = get_meta("night", 0.0)
	_update_ride(dt)
	life.update(dt, p, night * (1.0 - storm_k), riding)
	traffic.update(dt, p, night)
	for rv in rivers: rv.update(dt, p)
	for fr in far_roots: (fr[1] as Node3D).visible = (fr[0] as AABB).has_point(p)
	var sph: Dictionary = world["sphinx"]
	quest.update(dt, p, {"fly": player.fly, "on_floor": player.is_on_floor(), "speed": Vector2(player.velocity.x, player.velocity.z).length(),
		"outdoors": not inside, "night": night > 0.5, "storm": storm_k > 0.5, "riding": riding != null,
		"sphinx": absf(p.x - (float(sph["x"]) + 30.0)) < 8.0 and absf(p.z - float(sph["z"])) < 8.0 and p.y < float(sph["floorY"]) + 3.0,
		"show": night > 0.5 and not inside and p.distance_to(life.show_origin()) < 160.0})
	if toast_left > 0.0:
		toast_left -= dt
		if toast_left <= 0.0: hud_toast.visible = false
	elif toasts.size() > 0:
		var tt: Array = toasts.pop_front()
		hud_toast.text = tt[0]
		hud_toast.visible = true
		toast_left = tt[1]
	var auto := inside or night > 0.5
	player.lamp.visible = lamp_user != auto
	player.lamp.light_energy = 1.2 if in_zone else 4.0
	var best = null
	var score := INF
	for q in pois:
		var d: float = p.distance_to(q["pos"])
		if d < q["radius"] and d / q["radius"] + q["radius"] * 0.002 < score:
			score = d / q["radius"] + q["radius"] * 0.002
			best = q
	hud_site.text = best["name"] if best != null else ""
	hud_blurb.text = best["blurb"] if best != null else ""
	var hh := int(hour)
	hud_pos.text = "E %d  N %d  alt %d m ASL   ·   %02d:%02d" % [roundi(p.x), roundi(-p.z), roundi(p.y + float(world["geo"]["datumASL"])), hh, int((hour - hh) * 60)]
	if shot_path != "":
		frames += 1
		if frames == 24:
			if shot_keys.contains("probe"):
				for q in [Vector3(7.29, 12, -120), Vector3(0, 12, -118), Vector3(-322.21, 20, 236), Vector3(-322.21, 30, 250)]:
					var rq := PhysicsRayQueryParameters3D.create(q, q + Vector3(0, -40, 0))
					var hit := get_world_3d().direct_space_state.intersect_ray(rq)
					print("PROBE ", q, " -> ", hit.get("position", "none"), " ", hit.get("collider", "").get_parent().name if hit.has("collider") else "")
			if shot_keys.contains("audit"):
				var sp := get_world_3d().direct_space_state
				for spt in life.SPOTS:
					var worst := 0.0
					var sum := 0.0
					var names := {}
					for k in 60:
						var aa := k * 2.39996
						var rr := sqrt((k + 0.5) / 60.0) * float(spt[2])
						var xx: float = spt[0] + cos(aa) * rr
						var zz: float = spt[1] + sin(aa) * rr
						var th := terrain_height(xx, zz)
						var hit := sp.intersect_ray(PhysicsRayQueryParameters3D.create(Vector3(xx, th + 40, zz), Vector3(xx, th - 40, zz)))
						if hit.is_empty(): continue
						var dd: float = th - hit["position"].y
						sum += absf(dd)
						if absf(dd) > absf(worst): worst = dd
						if absf(dd) > 0.3: names[hit["collider"].get_parent().name] = names.get(hit["collider"].get_parent().name, 0) + 1
					print("AUDIT spot ", spt, " mean |d| %.2f worst %.2f " % [sum / 60.0, worst], names)
			if shot_keys.contains("audit"):
				var sp2 := get_world_3d().direct_space_state
				var groups := {"visitor": [], "mover": [], "caravan": [], "rideable": [], "walker": []}
				for q in life.people: groups["visitor"].append(q["g"])
				for q in life.movers: groups["mover"].append(q["g"])
				for q in life.caravan: groups["caravan"].append(q["g"])
				for q in life.rideables: groups["rideable"].append(q)
				for q in traffic.walkers:
					if q["g"].visible: groups["walker"].append(q["g"])
				for gk in groups:
					var nfloat := 0
					var nsunk := 0
					var worstf := 0.0
					var worsts := 0.0
					var wheref := Vector3.ZERO
					var wheres := Vector3.ZERO
					for gn in groups[gk]:
						var gp: Vector3 = gn.global_position
						var rq2 := PhysicsRayQueryParameters3D.create(gp + Vector3(0, 30, 0), gp + Vector3(0, -30, 0))
						rq2.collision_mask = 1
						var ex: Array[RID] = []
						for ch in gn.find_children("*", "CollisionObject3D", true, false): ex.append(ch.get_rid())
						rq2.exclude = ex
						var h2 := sp2.intersect_ray(rq2)
						if h2.is_empty(): continue
						var d2: float = gp.y - h2["position"].y
						if d2 > 0.15:
							nfloat += 1
							if d2 > worstf:
								worstf = d2
								wheref = gp
						if d2 < -0.15:
							nsunk += 1
							if d2 < worsts:
								worsts = d2
								wheres = gp
					print("AUDIT2 %s n=%d floating %d (worst %.2f at %s) sunk/under %d (worst %.2f at %s)" % [gk, groups[gk].size(), nfloat, worstf, wheref, nsunk, worsts, wheres])
			if shot_keys.contains("rooms"):
				for tp in travel:
					print("ROOM ", tp["label"], " inside=", _is_inside(tp["pos"] + Vector3(0, 1.0, 0)))
				for q in pois:
					var inz2 := false
					for z2 in zones:
						if z2.has_point(q["pos"]): inz2 = true
					if inz2 and not _is_inside(q["pos"] + Vector3(0, 0.3, 0)): print("POI in a zone but open to the sky: ", q["name"], " ", q["pos"])
			if shot_keys.contains("where"):
				print("CAMERA ", get_viewport().get_camera_3d().global_position, " player ", player.global_position, " ground here ", terrain_height(player.global_position.x, player.global_position.z))
				for q in life.people:
					var gq: Node3D = q["g"]
					if gq.global_position.distance_to(player.global_position) < 6.0:
						var top := -1e9
						var bot := 1e9
						for mi in gq.find_children("*", "MeshInstance3D", true, false):
							var ab: AABB = (mi as MeshInstance3D).global_transform * (mi as MeshInstance3D).get_aabb()
							top = maxf(top, ab.end.y)
							bot = minf(bot, ab.position.y)
						print("NEAR person at ", gq.global_position, " scale ", gq.scale, " ground ", terrain_height(gq.global_position.x, gq.global_position.z), " mesh bottom ", bot, " top ", top)
				for q in life.movers: print("MOVER ", "carriage" if q["carriage"] else "camel", " ", q["g"].global_position, " yaw ", q["g"].rotation.y)
				for q in life.caravan: print("CARAVAN ", q["g"].global_position)
				for q in life.rideables: print("RIDEABLE ", q.global_position)
			if shot_keys.contains("lattice"):
				var sp3 := get_world_3d().direct_space_state
				var low := {}
				var dark := {}
				var high := {}
				var nlow := 0
				var nhigh := 0
				var x3 := -1490.0
				while x3 < 1090.0:
					var z3 := -690.0
					while z3 < 1490.0:
						var th3 := terrain_height(x3, z3)
						var rq3 := PhysicsRayQueryParameters3D.create(Vector3(x3, th3 + 150, z3), Vector3(x3, th3 - 60, z3))
						var h3 := sp3.intersect_ray(rq3)
						if not h3.is_empty():
							var d3: float = h3["position"].y - th3
							var nm3 := String(h3["collider"].get_parent().name)
							var key := "%d,%d" % [int(floor(x3 / 100.0)) * 100, int(floor(z3 / 100.0)) * 100]
							if _is_inside(h3["position"] + Vector3(0, 1.0, 0)):
								var why := "zone"
								var inz := false
								for zz3 in zones:
									if zz3.has_point(h3["position"] + Vector3(0, 1.0, 0)): inz = true
								if not inz: why = "pyr/terrain"
								var k5 := "%s %d,%d" % [why, int(floor(x3 / 50.0)) * 50, int(floor(z3 / 50.0)) * 50]
								dark[k5] = dark.get(k5, 0) + 1
							if d3 < -2.2:
								nlow += 1
								low[key] = low.get(key, 0) + 1
							if nm3.begins_with("sand") and absf(d3) > 0.3:
								nhigh += 1
								high[key] = maxf(high.get(key, 0.0), absf(d3))
						z3 += 4.0
					x3 += 4.0
				print("LATTICE false-inside points ", nlow, " ", low)
				print("LATTICE open-sky spots treated as indoors: ", dark)
				print("LATTICE sand-vs-grid mismatch >0.3 m: ", nhigh, " ", high)
			if shot_keys.contains("map"): _toggle_map()
			if shot_keys.contains("storm"):
				storm = true
				storm_k = 1.0
			if shot_keys.contains("ride") and _nearest_camel() != null: _mount(_nearest_camel())
			if shot_keys.contains("crouch"): Input.action_press("crouch")
			if shot_keys.contains("fwd"):
				Input.action_press("move_forward")
				walk_from = player.global_position
		if walk_from != Vector3.INF:
			walk_t += dt
			walk_min_open = minf(walk_min_open, 1.0 - inside_k)
			if shot_keys.contains("trace") and int(walk_t) != int(walk_t - dt):
				var tp := player.global_position
				var hits := ""
				for ci in player.get_slide_collision_count():
					var kc := player.get_slide_collision(ci)
					hits += " [%s n=%s]" % [kc.get_collider().get_parent().name, kc.get_normal()]
				print("TRACE t=%d pos=%s h=%.2f vel=%s%s" % [int(walk_t), tp, player.height, player.velocity, hits])
				print("   real_vel=", player.get_real_velocity(), " last_motion=", player.get_last_motion(), " delta=", player.get_position_delta(), " wall=", player.is_on_wall(), " wn=", player.get_wall_normal(), " floor=", player.is_on_floor(), " fn=", player.get_floor_normal(), " yaw=", player.yaw, " frozen=", player.frozen)
				var here := player.global_transform
				var hvv := Vector3(player.velocity.x, 0, player.velocity.z)
				var k3 := KinematicCollision3D.new()
				var up_blocked := player.test_move(here, Vector3(0, 0.5, 0), k3)
				var lifted := here.translated(Vector3(0, 0.5, 0))
				var fwd := hvv / 60.0 + hvv.normalized() * 0.08
				var k4 := KinematicCollision3D.new()
				var fwd_blocked := player.test_move(lifted, fwd, k4)
				var k5 := KinematicCollision3D.new()
				var moved := lifted.translated(fwd)
				var down_hit := player.test_move(moved, Vector3(0, -0.55, 0), k5)
				print("   DOWN hit=", down_hit, " travel=", k5.get_travel() if down_hit else Vector3.ZERO, " -> would be ", (moved.origin + k5.get_travel()) if down_hit else moved.origin)
				print("   STEP up_blocked=", up_blocked, (" by %s n=%s" % [k3.get_collider().get_path(), k3.get_normal()]) if up_blocked else "", " fwd_blocked=", fwd_blocked, (" by %s n=%s at %s" % [k4.get_collider().get_path(), k4.get_normal(), k4.get_position()]) if fwd_blocked else "")
				for dv in [player.velocity / 60.0, Vector3(-0.083, 0, 0), Vector3(-0.083, 0, 0.007), Vector3(0, 0, 0.05), Vector3(0, 0, -0.05), Vector3(0, -0.05, 0), Vector3(-0.083, -0.027, 0.007)]:
					var k2 := KinematicCollision3D.new()
					if player.test_move(player.global_transform, dv, k2):
						print("   BLOCK ", dv, " by ", k2.get_collider().get_path(), " at ", k2.get_position(), " n=", k2.get_normal(), " travel=", k2.get_travel())
			if walk_i < walk_path.size():
				var to := walk_path[walk_i] - Vector2(player.global_position.x, player.global_position.z)
				if to.length() < 0.45: walk_i += 1
				else:
					player.yaw = atan2(-to.x, -to.y)
					player.rotation.y = player.yaw
			elif walk_path.size() > 0: walk_t = walk_secs
			if walk_t < walk_secs: return
			if walk_path.size() > 0: print("PATH reached %d of %d waypoints" % [walk_i, walk_path.size()])
			for ci in player.get_slide_collision_count():
				var kc := player.get_slide_collision(ci)
				print("  HIT ", kc.get_collider().get_parent().name, " normal ", kc.get_normal(), " at ", kc.get_position())
			var q := player.global_position
			print("LIGHT darkest moment of the walk: %.0f%% of full daylight" % (walk_min_open * 100.0))
			print("WALK from %s to %s: %.1f m in %.1f s, ground %.2f, on floor %s" % [walk_from, q, Vector2(q.x - walk_from.x, q.z - walk_from.z).length(), walk_t, terrain_height(q.x, q.z), player.is_on_floor()])
			frames = 70
		if frames == 70:
			var img := get_viewport().get_texture().get_image()
			if img != null: img.save_png(shot_path)
			get_tree().quit()
