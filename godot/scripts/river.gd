extends Node3D
## Boats on the Nile (models: tools/blender/boats.py), placed and moved from
## the empties in a river scene (tools/blender/luxor_nile.py):
##   moor_<boat>_<n>   lies moored there
##   lane_<n>_a / _b   boats sail or motor back and forth along it
##   ferry_a / ferry_b the public ferry shuttles between the two landings
##   board_<boat>_<n>  a boat you can board with E for a trip on the river

var main: Node
var meshes := {}
var movers := []                 # {g, a, b, t, speed, bob, wait, kind}
var boardable := []              # {g, home: Transform3D, kind}
var riding := {}                 # the boat the player is on (or empty)
var ride_t := 0.0
var time := 0.0
var landing := Vector3.ZERO


func setup(main_node: Node, root: Node3D) -> void:
	main = main_node
	var scene: PackedScene = load("res://models/boats.glb")
	var src := scene.instantiate()
	for n in src.find_children("*", "MeshInstance3D", true, false):
		var mesh: Mesh = (n as MeshInstance3D).mesh.duplicate()
		for s in mesh.get_surface_count():
			var m := mesh.surface_get_material(s)
			if m != null: mesh.surface_set_material(s, main._outdoor_material(m.resource_name))
		meshes[String(n.name)] = mesh
	src.free()
	var lanes := {}
	var ferry := {}
	for n in root.find_children("*", "Node3D", true, false):
		var nm := String(n.name)
		var e: Node3D = n
		if nm.begins_with("moor_"):
			var g := _boat(nm.split("_")[1])
			if g:
				g.global_transform = e.global_transform
				g.set_meta("bob", randf() * 6.0)
				movers.append({"g": g, "kind": "moored", "y": g.global_position.y, "bob": randf() * 6.0})
		elif nm.begins_with("board_"):
			var g := _boat(nm.split("_")[1])
			if g:
				g.global_transform = e.global_transform
				boardable.append({"g": g, "home": e.global_transform, "kind": nm.split("_")[1]})
		elif nm.begins_with("lane_"):
			var k := nm.split("_")[1]
			if not lanes.has(k): lanes[k] = {}
			lanes[k][nm.split("_")[2]] = e.global_position
		elif nm == "ferry_a" or nm == "ferry_b":
			ferry[nm] = e.global_position
		elif nm == "tp_east_landing":
			landing = e.global_position
	# traffic on the river: feluccas tacking along the banks, a dahabiya and cruise ships in mid-stream, launches
	var plan := [["felucca", 2.2], ["launch", 4.5], ["cruiser", 3.2], ["felucca", 1.9], ["dahabiya", 2.4], ["felucca", 2.4], ["launch", 5.0], ["cruiser", 3.0]]
	var i := 0
	for k in lanes:
		if not (lanes[k].has("a") and lanes[k].has("b")): continue
		for j in 2:
			var p: Array = plan[(i * 2 + j) % plan.size()]
			var g := _boat(p[0])
			if g: movers.append({"g": g, "kind": "lane", "a": lanes[k]["a"], "b": lanes[k]["b"], "t": randf() * 2.0, "speed": p[1], "bob": randf() * 6.0, "off": (j * 2 - 1) * 14.0})
		i += 1
	if ferry.size() == 2:
		var g := _boat("ferry")
		if g: movers.append({"g": g, "kind": "ferry", "a": ferry["ferry_a"], "b": ferry["ferry_b"], "t": 0.0, "speed": 3.0, "bob": 0.0, "wait": 20.0})


func _boat(kind: String) -> MeshInstance3D:
	if not meshes.has(kind): return null
	var mi := MeshInstance3D.new()
	mi.mesh = meshes[kind]
	add_child(mi)
	return mi


func _face(g: Node3D, from: Vector3, to: Vector3, pos: Vector3, roll := 0.0) -> void:
	var d := to - from
	g.global_transform = Transform3D(Basis(Vector3.UP, atan2(-d.z, d.x)) * Basis(Vector3(1, 0, 0), roll), pos)


func update(dt: float, eye: Vector3) -> void:
	time += dt
	if movers.is_empty() or eye.distance_to(movers[0]["g"].global_position) > 4000.0: return
	for m in movers:
		var g: Node3D = m["g"]
		if m["kind"] == "moored":
			g.global_position.y = m["y"] + sin(time * 0.7 + m["bob"]) * 0.04
		elif m["kind"] == "lane":
			var a: Vector3 = m["a"]
			var b: Vector3 = m["b"]
			var length := a.distance_to(b)
			m["t"] = fmod(m["t"] + m["speed"] * dt / length, 2.0)
			var u: float = m["t"] if m["t"] < 1.0 else 2.0 - m["t"]
			var going: bool = m["t"] < 1.0
			var side := (b - a).normalized().cross(Vector3.UP) * float(m["off"]) * (1.0 if going else -1.0)     # keep right
			var pos := a.lerp(b, u) + side + Vector3(0, sin(time * 0.6 + m["bob"]) * 0.05, 0)
			_face(g, a if going else b, b if going else a, pos, sin(time * 0.5 + m["bob"]) * 0.02)
		else:                                                    # the ferry: cross, wait at the landing, cross back
			if m["wait"] > 0.0:
				m["wait"] -= dt
			else:
				var length: float = m["a"].distance_to(m["b"])
				m["t"] += m["speed"] * dt / length
				if m["t"] >= 1.0:
					m["t"] = 0.0
					m["wait"] = 25.0
					var tmp: Vector3 = m["a"]
					m["a"] = m["b"]
					m["b"] = tmp
			var s := smoothstep(0.0, 1.0, m["t"])
			_face(g, m["a"], m["b"], (m["a"] as Vector3).lerp(m["b"], s))
	for b in boardable:
		if riding.is_empty() or riding["g"] != b["g"]:
			var t3: Transform3D = b["home"]
			t3.origin.y += sin(time * 0.7) * 0.04
			b["g"].global_transform = t3
	if not riding.is_empty(): _ride(dt)


# ---- a trip on the river: out into the stream, down and back, and home to the landing ----------------
func nearest_boardable(p: Vector3):
	for b in boardable:
		if b["g"].global_position.distance_to(p) < 9.0: return b
	return null


func board(b: Dictionary) -> void:
	riding = b
	ride_t = 0.0
	main.player.frozen = true
	main.player.fly = false


func leave() -> void:
	riding = {}
	main.player.frozen = false
	main.player.teleport(landing)


func _ride(dt: float) -> void:
	ride_t += dt
	var home: Transform3D = riding["home"]
	var out := -home.basis.z.normalized() if false else Vector3(-1, 0, 0)      # away from the East Bank
	var along := Vector3(0, 0, -1)                                             # north, with the current
	var speed := 2.6 if riding["kind"] == "felucca" else 5.0
	# a rounded rectangle: 150 m out, 500 m along, back in
	var legs := [[out, 150.0], [along, 500.0], [out, 120.0], [-along, 500.0], [-out, 270.0]]
	var d := ride_t * speed
	var pos := home.origin
	var dir: Vector3 = legs[0][0]
	var done := true
	for l in legs:
		if d < l[1]:
			pos += l[0] * d
			dir = l[0]
			done = false
			break
		pos += l[0] * l[1]
		d -= l[1]
	if done:
		leave()
		main.toast("Back at the landing.", 2.5)
		return
	var g: Node3D = riding["g"]
	var cur_yaw := g.global_transform.basis.get_euler().y
	var yaw := lerp_angle(cur_yaw, atan2(-dir.z, dir.x), minf(1.0, dt * 0.8))
	g.global_transform = Transform3D(Basis(Vector3.UP, yaw) * Basis(Vector3(1, 0, 0), sin(time * 0.5) * 0.03), pos + Vector3(0, sin(time * 0.6) * 0.05, 0))
	main.player.global_position = g.global_transform * Vector3(-1.2, 0.62, 0.0)
	main.player.velocity = Vector3.ZERO
