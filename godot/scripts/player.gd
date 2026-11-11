extends CharacterBody3D
## First-person walker: capsule 0.35 m radius, 1.8 m tall (1.05 m crouched —
## the real passages need it), stair stepping, a head lamp, and a fly mode.

const WALK := 5.0
const RUN := 11.0
const JUMP := 7.0
const STAND_H := 1.8
const CROUCH_H := 1.05
const STEP := 0.5
const FLY := 30.0

var cam: Camera3D
var lamp: SpotLight3D
var shape: CapsuleShape3D
var col: CollisionShape3D
var height := STAND_H
var fly := false
var frozen := false
var yaw := 0.0
var pitch := 0.0
var speed_mul := 1.0          # riding a camel: faster, and seated higher
var eye_extra := 0.0
var face_pending := 0         # after a teleport: turn to face the open side
var face_hint := Vector3.ZERO


func _init() -> void:
	shape = CapsuleShape3D.new()
	shape.radius = 0.35
	shape.height = STAND_H
	col = CollisionShape3D.new()
	col.shape = shape
	col.position.y = STAND_H / 2
	add_child(col)
	cam = Camera3D.new()
	cam.fov = 72
	cam.near = 0.05
	cam.far = 4000
	cam.position.y = STAND_H - 0.18
	add_child(cam)
	lamp = SpotLight3D.new()
	lamp.spot_range = 22
	lamp.spot_angle = 42
	lamp.light_energy = 1.2
	lamp.light_color = Color(1.0, 0.93, 0.8)
	lamp.shadow_enabled = false
	cam.add_child(lamp)
	floor_max_angle = deg_to_rad(52)
	floor_snap_length = 0.35
	safe_margin = 0.01


func teleport(p: Vector3, face := false, hint := Vector3.ZERO) -> void:
	global_position = p
	velocity = Vector3.ZERO
	if face:
		face_pending = 3
		face_hint = hint


# Turn towards the most open direction (so a teleport never leaves you
# nose-to-wall), leaning towards `face_hint` when all sides are open.
func _face_open() -> void:
	var space := get_world_3d().direct_space_state
	var eye := global_position + Vector3(0, height - 0.18, 0)
	var to_hint := Vector3(face_hint.x - eye.x, 0, face_hint.z - eye.z)
	var hint_dir := to_hint.normalized() if to_hint.length() > 3.0 else Vector3.ZERO
	var best := -1.0
	for k in 32:
		var a := k * TAU / 32.0
		var d := Vector3(-sin(a), 0, -cos(a))
		var q := PhysicsRayQueryParameters3D.create(eye, eye + d * 60.0)
		q.exclude = [get_rid()]
		var hit := space.intersect_ray(q)
		var dist := 60.0 if hit.is_empty() else eye.distance_to(hit["position"])
		var score := minf(dist, 25.0) + 12.0 * d.dot(hint_dir)
		if score > best:
			best = score
			yaw = a
	pitch = 0.0
	_apply_look()


func look_at_point(p: Vector3) -> void:
	var d := p - cam.global_position
	yaw = atan2(-d.x, -d.z)
	pitch = atan2(d.y, Vector2(d.x, d.z).length())
	_apply_look()


func _apply_look() -> void:
	rotation.y = yaw
	cam.rotation.x = pitch


func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		yaw -= ev.relative.x * 0.0022
		pitch = clampf(pitch - ev.relative.y * 0.0022, -1.5, 1.5)
		_apply_look()
	elif ev.is_action_pressed("toggle_fly"): fly = not fly


func _can_stand() -> bool:
	var q := PhysicsShapeQueryParameters3D.new()
	var s := CapsuleShape3D.new()
	s.radius = 0.33
	s.height = STAND_H - 0.05
	q.shape = s
	q.transform = Transform3D(Basis.IDENTITY, global_position + Vector3(0, STAND_H / 2 + 0.04, 0))
	q.exclude = [get_rid()]
	return get_world_3d().direct_space_state.intersect_shape(q, 1).is_empty()


func _physics_process(dt: float) -> void:
	if face_pending > 0:
		face_pending -= 1
		if face_pending == 0: _face_open()
	if frozen: return
	var want_crouch := Input.is_action_pressed("crouch") and not fly
	var target := CROUCH_H if (want_crouch or (height < STAND_H - 0.02 and not _can_stand())) else STAND_H
	height = move_toward(height, target, dt * 5.0)
	shape.height = height
	col.position.y = height / 2
	cam.position.y = height - 0.18 + eye_extra

	var iv := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var dir := (transform.basis * Vector3(iv.x, 0, iv.y))
	if fly:
		var v := (cam.global_transform.basis * Vector3(iv.x, 0, iv.y)) * FLY * (3.0 if Input.is_action_pressed("sprint") else 1.0)
		if Input.is_action_pressed("jump"): v.y += FLY
		if Input.is_action_pressed("crouch"): v.y -= FLY
		global_position += v * dt
		velocity = Vector3.ZERO
		return
	var speed := (RUN if Input.is_action_pressed("sprint") else WALK) * speed_mul
	if height < STAND_H - 0.2: speed = WALK * 0.5
	velocity.x = move_toward(velocity.x, dir.x * speed, dt * 60.0)
	velocity.z = move_toward(velocity.z, dir.z * speed, dt * 60.0)
	if is_on_floor():
		if Input.is_action_just_pressed("jump") and height > STAND_H - 0.1: velocity.y = JUMP
	else:
		velocity.y -= 24.0 * dt
	var before := global_position
	var hv := Vector3(velocity.x, 0, velocity.z)
	move_and_slide()
	# stair stepping: if a low obstacle stopped us, retry the move lifted by STEP
	if hv.length() > 0.1 and is_on_wall() and (is_on_floor() or velocity.y <= 0.0):
		var got := Vector2(global_position.x - before.x, global_position.z - before.z).length()
		if got < hv.length() * dt * 0.6:
			var here := global_transform
			var up := Vector3(0, STEP, 0)
			if not test_move(here, up):
				var lifted := here.translated(up)
				var fwd := hv * dt + hv.normalized() * 0.08
				if not test_move(lifted, fwd):
					var res := KinematicCollision3D.new()
					var down := Vector3(0, -STEP - 0.05, 0)
					var moved := lifted.translated(fwd)
					if test_move(moved, down, res):
						global_position = moved.origin + res.get_travel()
						velocity.y = 0
