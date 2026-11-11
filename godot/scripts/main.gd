extends Node3D
## Giza Plateau — native build, first slice.
## Loads the Blender-built sites (res://models/*.glb), gives them collision and
## baked-light stone materials, places their inscription and photograph
## panels, and lets you walk them in first person with fast travel.
##
## Model conventions (see tools/blender/gizalib.py): mesh material names pick
## the stone; empties named insc_<key> / tex_<key> are wall panels, poi_<key>
## are points of interest, tp_<key> / spawn are fast-travel points.

const STONE := preload("res://scripts/stone.gdshader")
const Player := preload("res://scripts/player.gd")

# material name -> [base colour, roughness, bake gain, strata, joint height, joint width]
const STONES := {
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
const PHOTOS := ["dream_stele", "mer_pillar", "mer_wpillar", "mer_north", "mer_east", "mer_west", "mer_kawab", "mer_jamb", "mer_list"]

var mats := {}
var insc_index: Array = []
var travel := []          # [{label, pos}]
var pois := []            # [{name, blurb, radius, pos}]
var player: CharacterBody3D
var hud_site: Label
var hud_blurb: Label
var hud_hint: Label
var menu: ItemList
var shot_path := ""
var shot_at := ""
var frames := 0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="): shot_path = a.substr(7)
		if a.begins_with("--at="): shot_at = a.substr(5)
	_environment()
	_materials()
	insc_index = JSON.parse_string(FileAccess.get_file_as_string("res://data/inscriptions.json"))
	var sites: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/sites.json"))
	for m in sites["models"]:
		_place_model(m)
	_spawn_player()
	_hud()
	if travel.size() > 0:
		var start := 0
		for i in travel.size():
			if shot_at != "" and travel[i]["label"].to_lower().contains(shot_at.to_lower()): start = i
		_go(start)
	if shot_path == "": Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color.BLACK
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.5, 0.45, 0.4)
	env.ambient_light_energy = 0.02
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.glow_enabled = true
	env.glow_intensity = 0.4
	env.glow_bloom = 0.05
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


func _materials() -> void:
	for k in STONES:
		var v: Array = STONES[k]
		var m := ShaderMaterial.new()
		m.shader = STONE
		m.set_shader_parameter("base_color", v[0])
		m.set_shader_parameter("roughness_value", v[1])
		m.set_shader_parameter("bake_gain", v[2])
		m.set_shader_parameter("strata", v[3])
		m.set_shader_parameter("joint_h", v[4])
		m.set_shader_parameter("joint_w", v[5])
		mats[k] = m
	var fx := StandardMaterial3D.new()
	fx.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	fx.albedo_color = Color(1.0, 0.94, 0.8)
	fx.emission_enabled = true
	fx.emission = Color(1.0, 0.92, 0.75)
	fx.emission_energy_multiplier = 2.5
	mats["fixture"] = fx
	var dark := StandardMaterial3D.new()
	dark.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	dark.albedo_color = Color(0.03, 0.025, 0.02)
	mats["dark"] = dark


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
	for n in _walk(root):
		var nm := String(n.name)
		if n is MeshInstance3D:
			_dress(n)
		elif nm.begins_with("insc_") or nm.begins_with("tex_"):
			_panel(n)
		elif nm.begins_with("poi_") or nm.begins_with("tp_") or nm == "spawn":
			anchors[nm] = (n as Node3D).global_position
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
		mi.set_surface_override_material(s, mats.get(nm, mats["rock"]))
		if nm != "fixture" and nm != "dark": solid = true
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if solid and not _is_deco(mi):
		mi.create_trimesh_collision()


func _panel(e: Node3D) -> void:
	var nm := String(e.name)
	var photo := nm.begins_with("tex_")
	var key := nm.substr(4 if photo else 5)
	var dot := key.rfind(".")
	if dot > 0 and key.substr(dot + 1).is_valid_int(): key = key.substr(0, dot)
	# Godot renames duplicate nodes "name2", "name3": strip a trailing digit run that is not part of the key
	var path := ""
	if photo:
		for k in PHOTOS:
			if key.begins_with(k) and (path == "" or k.length() > path.get_file().get_basename().length()):
				for ext in ["jpg", "png"]:
					if ResourceLoader.exists("res://textures/%s.%s" % [k, ext]): path = "res://textures/%s.%s" % [k, ext]
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


func _spawn_player() -> void:
	player = Player.new()
	add_child(player)


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
	layer.add_child(hud_blurb)
	hud_hint = Label.new()
	hud_hint.position = Vector2(16, 12)
	hud_hint.add_theme_font_size_override("font_size", 14)
	hud_hint.modulate = Color(1, 1, 1, 0.75)
	hud_hint.text = "WASD move · mouse look · C crouch · Shift run · Space jump · F fly · L lamp · Tab / M travel · Esc release mouse"
	layer.add_child(hud_hint)
	menu = ItemList.new()
	menu.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	menu.custom_minimum_size = Vector2(620, 360)
	menu.position -= Vector2(310, 180)
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
	player.teleport(travel[i]["pos"])


func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("travel_menu"): _toggle_menu()
	elif ev.is_action_pressed("ui_cancel"):
		if menu.visible: _toggle_menu()
		else: Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif ev is InputEventMouseButton and ev.pressed and not menu.visible:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _process(_dt: float) -> void:
	var best = null
	var bd := INF
	for q in pois:
		var d: float = player.global_position.distance_to(q["pos"])
		if d < q["radius"] and d < bd:
			bd = d
			best = q
	hud_site.text = best["name"] if best != null else ""
	hud_blurb.text = best["blurb"] if best != null else ""
	if shot_path != "":
		frames += 1
		if frames == 40:
			get_viewport().get_texture().get_image().save_png(shot_path)
			get_tree().quit()
