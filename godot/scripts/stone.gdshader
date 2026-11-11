// Stone lit the way the Blender models were baked: vertex colour is light
// (Cycles bake), added as emission on top of the player's lamp. Colour is
// procedural: bedding planes and a pitted surface, optional masonry joints.
shader_type spatial;
render_mode cull_disabled;

uniform vec3 base_color : source_color = vec3(0.72, 0.66, 0.55);
uniform float roughness_value = 0.95;
uniform float bake_gain = 1.0;
uniform float strata = 1.0;
uniform float joint_h = 0.0;      // course height (0 = no joints)
uniform float joint_w = 1.0;      // block length

varying vec3 wp;
varying vec3 wn;

float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise3(vec3 p) {
	vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	float s = noise3(vec3(wp.x * 0.25, wp.y * 3.2, wp.z * 0.25));
	float t = noise3(wp * 1.9) * 0.6 + noise3(wp * 6.5) * 0.4;
	vec3 c = base_color * (1.0 - 0.22 * strata * (1.0 - s)) * (0.82 + 0.3 * t);
	if (joint_h > 0.0 && abs(wn.y) < 0.7) {
		float row = floor(wp.y / joint_h);
		float u = (abs(wn.x) > abs(wn.z) ? wp.z : wp.x) + hash3(vec3(row, 3.0, 1.0)) * joint_w;
		float jh = smoothstep(0.012, 0.0, abs(fract(wp.y / joint_h + 0.5) - 0.5) * joint_h);
		float jv = smoothstep(0.012, 0.0, abs(fract(u / joint_w + 0.5) - 0.5) * joint_w);
		c *= 1.0 - 0.55 * max(jh, jv);
		c *= 0.93 + 0.14 * hash3(vec3(floor(u / joint_w), row, 7.0));
	}
	ALBEDO = c;
	ROUGHNESS = roughness_value;
	EMISSION = c * (COLOR.rgb * bake_gain + 0.004);
}
