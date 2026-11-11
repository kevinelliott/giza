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
const Player := preload("res://scripts/player.gd")

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
const PHOTOS := ["dream_stele", "mer_pillar", "mer_wpillar", "mer_north", "mer_east", "mer_west", "mer_kawab", "mer_jamb", "mer_list"]
const HOURS := [9.5, 12.0, 16.0, 18.4, 21.5, 6.2]
const LAT := 29.98

var baked := {}
var outdoor := {}
var insc_index: Array = []
var travel := []          # [{label, pos, look?}]
var pois := []            # [{name, blurb, radius, pos}]
var zones: Array[AABB] = []   # the Blender interiors (pre-lit)
var world := {}
var heights := PackedFloat32Array()
var player: CharacterBody3D
var env: Environment
var sun: DirectionalLight3D
var sky_mat: ProceduralSkyMaterial
var town_mat: ShaderMaterial
var hour_i := 0
var hour := 9.5
var sun_energy := 1.0
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


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="): shot_path = a.substr(7)
		if a.begins_with("--at="): shot_at = a.substr(5)
		if a.begins_with("--look="): shot_look = a.substr(7)
		if a.begins_with("--hour="): hour = float(a.substr(7))
	world = JSON.parse_string(FileAccess.get_file_as_string("res://data/world.json"))
	heights = FileAccess.get_file_as_bytes("res://data/terrain.bin").to_float32_array()
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
	_hud()
	var start := 0
	for i in travel.size():
		if shot_at != "" and travel[i]["label"].to_lower().contains(shot_at.to_lower()):
			start = i
			break
	_go(start)
	if shot_at == "": player.look_at_point(Vector3(-94, 30, 84))        # Khufu and Khafre from the overlook
	if shot_look != "":
		var c := shot_look.split(",")
		if c.size() == 6:
			player.fly = true
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
	sun.directional_shadow_max_distance = 900.0
	sun.shadow_bias = 0.06
	sun.shadow_normal_bias = 2.0
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
	sun_energy = (0.2 + 0.95 * smoothstep(0.0, 30.0, el)) if el > 0.5 else 0.06
	sky_mat.sky_top_color = Color(0.20, 0.38, 0.68).lerp(Color(0.012, 0.018, 0.045), 1.0 - day)
	sky_mat.sky_horizon_color = Color(0.72, 0.78, 0.84).lerp(Color(0.95, 0.62, 0.38), warm * day).lerp(Color(0.03, 0.04, 0.07), 1.0 - day)
	sky_mat.ground_horizon_color = sky_mat.sky_horizon_color
	sky_mat.ground_bottom_color = Color(0.66, 0.62, 0.52).lerp(Color(0.02, 0.02, 0.03), 1.0 - day)
	sky_mat.sun_angle_max = 6.0
	env.fog_light_color = Color(0.84, 0.78, 0.65).lerp(Color(0.95, 0.66, 0.42), warm * day).lerp(Color(0.02, 0.03, 0.05), 1.0 - day)
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
		if k == "vcol":
			vm.set_shader_parameter("roughness_value", 0.4)
			vm.set_shader_parameter("grain", 0.0)
		outdoor[k] = vm
	town_mat = ShaderMaterial.new()
	town_mat.shader = TOWN
	outdoor["town"] = town_mat


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


func _is_inside(p: Vector3) -> bool:
	for z in zones:
		if z.has_point(p): return true
	for py in world["pyramids"]:
		var y := p.y - float(py["baseY"])
		var w: float = float(py["base"]) / 2.0 * (1.0 - maxf(0.0, y) / float(py["height"])) - 1.2
		if absf(p.x - float(py["x"])) < w and absf(p.z - float(py["z"])) < w: return true
	var s: Dictionary = world["sphinx"]
	var in_pit := absf(p.x - float(s["x"]) - 2.0) < 55.0 and absf(p.z - float(s["z"])) < 34.0
	return not in_pit and p.y < terrain_height(p.x, p.z) - 1.2


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
	for n in _walk(root):
		var nm := String(n.name)
		if n is MeshInstance3D:
			_dress(n)
			var b: AABB = (n as MeshInstance3D).global_transform * (n as MeshInstance3D).get_aabb()
			box = b if first else box.merge(b)
			first = false
		elif nm.begins_with("insc_") or nm.begins_with("tex_"):
			_panel(n)
		elif nm.begins_with("poi_") or nm.begins_with("tp_") or nm == "spawn":
			anchors[nm] = (n as Node3D).global_position
	zones.append(box.grow(0.5))
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
		if nm != "fixture" and nm != "dark": solid = true
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
	hint.text = "WASD move · mouse look · C crouch · Shift run · Space jump · F fly · L lamp · T time of day · Tab / M travel · Esc release mouse"
	layer.add_child(hint)
	hud_pos = Label.new()
	hud_pos.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	hud_pos.grow_vertical = Control.GROW_DIRECTION_BEGIN
	hud_pos.position += Vector2(16, -16)
	hud_pos.add_theme_font_size_override("font_size", 14)
	hud_pos.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	layer.add_child(hud_pos)
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


func _go(i: int) -> void:
	player.fly = false
	player.teleport(travel[i]["pos"])


func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("travel_menu"): _toggle_menu()
	elif ev.is_action_pressed("toggle_lamp"): lamp_user = not lamp_user
	elif ev.is_action_pressed("time_of_day"):
		hour_i = (hour_i + 1) % HOURS.size()
		hour = HOURS[hour_i]
		_apply_time()
	elif ev.is_action_pressed("ui_cancel"):
		if menu.visible: _toggle_menu()
		else: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif ev is InputEventMouseButton and ev.pressed and not menu.visible:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _process(dt: float) -> void:
	var p := player.global_position
	# indoors the sun and sky are shut out; the rooms carry their own (baked) light
	var inside := _is_inside(p + Vector3(0, 1.0, 0))
	inside_k = move_toward(inside_k, 1.0 if inside else 0.0, dt * 3.0)
	sun.light_energy = sun_energy * (1.0 - inside_k)
	env.ambient_light_energy = lerpf(0.7, 0.0, inside_k)
	env.background_energy_multiplier = lerpf(1.0, 0.0, inside_k)
	env.fog_density = lerpf(0.00018, 0.0, inside_k)
	var in_zone := false
	for z in zones:
		if z.has_point(p): in_zone = true
	var night: float = get_meta("night", 0.0)
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
		if frames == 40:
			get_viewport().get_texture().get_image().save_png(shot_path)
			get_tree().quit()
