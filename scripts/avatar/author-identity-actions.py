"""Free, editable body-animation studies for the MPFB identity rig.

Import and call apply_actions(rig). It authors six idle actions and two variants
of each fixed gesture, creates individually muted NLA tracks, then restores the
neutral editing pose. No face animation is keyed: facial presets and speech stay
independent at runtime. These are authored motion studies, not motion capture or
an assertion that visual acceptance has passed. Source geometry is never edited.

Standalone: blender --background identity-rig.blend --python this-file --
  --output /tmp/identity-actions-study.blend --report /tmp/identity-actions.json
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

GESTURES = (
    'wave', 'open_palm_present', 'welcome_open_arms', 'shrug', 'count_on_fingers',
    'beat_small', 'beat_big', 'hand_to_chin', 'arms_crossed', 'thumbs_up', 'nod',
    'head_shake', 'head_tilt', 'laugh_body',
)
IDLES = (
    ('idle_breathe', 6.8), ('idle_glance_left', 7.5), ('idle_glance_right', 6.2),
    ('idle_shoulders', 5.8), ('idle_settle', 7.8), ('idle_collar', 7.2),
)
FPS = 30
PREFIX = 'avatar_guide_authored'
_RELAXED = {}


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def envelope(t, duration, attack=.65, release=.75):
    return smooth(t / attack) * smooth((duration - t) / release)


def rotate(rig, name, axis, angle):
    """Apply an armature-space angular delta through MPFB's actual local basis."""
    pb = rig.pose.bones.get(name)
    if pb is None or abs(angle) < 1e-8:
        return
    world = pb.matrix.to_quaternion().normalized()
    delta = Quaternion(Vector(axis).normalized(), angle)
    pb.rotation_quaternion = (pb.rotation_quaternion @ world.inverted() @ delta @ world).normalized()
    bpy.context.view_layer.update()


def aim(rig, bone_name, child_name, target, blend=1.):
    pb, child = rig.pose.bones[bone_name], rig.pose.bones[child_name]
    before, after = child.head - pb.head, Vector(target) - pb.head
    if before.length < 1e-6 or after.length < 1e-6:
        return
    delta = Quaternion().slerp(before.normalized().rotation_difference(after.normalized()), blend)
    world = pb.matrix.to_quaternion().normalized()
    pb.rotation_quaternion = (pb.rotation_quaternion @ world.inverted() @ delta @ world).normalized()
    bpy.context.view_layer.update()


def arm(rig, side, target, hand_direction=None, palm_front=False, hand_blend=1., pole_override=None, palm_normal=None):
    """Two-bone solve over the true shoulder/elbow/wrist joints, including twist bones."""
    upper, lower, hand = (rig.pose.bones[n + '.' + side] for n in ('upperarm01', 'lowerarm01', 'wrist'))
    shoulder, elbow, wrist = upper.head.copy(), lower.head.copy(), hand.head.copy()
    a, b = (elbow - shoulder).length, (wrist - elbow).length
    direction = Vector(target) - shoulder
    distance = min(a + b - .003, max(abs(a - b) + .003, direction.length))
    direction.normalize()
    pole = Vector(pole_override or (.4 if side == 'L' else -.4, -.25, -.9))
    pole -= direction * pole.dot(direction)
    if pole.length < 1e-6:
        pole = direction.cross(Vector((0, 0, 1)))
    pole.normalize()
    adjacent = (a * a - b * b + distance * distance) / (2 * distance)
    radial = math.sqrt(max(0, a * a - adjacent * adjacent))
    elbow_target = shoulder + direction * adjacent + pole * radial
    wrist_target = shoulder + direction * distance
    aim(rig, upper.name, lower.name, elbow_target)
    aim(rig, lower.name, hand.name, wrist_target)
    if hand_direction is not None:
        index = rig.pose.bones['finger2-1.' + side]
        tip = rig.pose.bones['finger2-3.' + side]
        current = (tip.tail - index.head).normalized()
        desired = Vector(hand_direction).normalized()
        delta = Quaternion().slerp(current.rotation_difference(desired), hand_blend)
        world = hand.matrix.to_quaternion().normalized()
        hand.rotation_quaternion = (hand.rotation_quaternion @ world.inverted() @ delta @ world).normalized()
        bpy.context.view_layer.update()
        if palm_front or palm_normal:
            # Align the hand's lateral span with screen-horizontal without twisting fingers.
            index = rig.pose.bones['finger2-1.' + side]
            pinky = rig.pose.bones['finger5-1.' + side]
            lateral = pinky.head - index.head
            normal = desired.cross(lateral).normalized() * (1 if side == 'L' else -1)
            desired_normal = Vector(palm_normal or (0, -1, 0))
            desired_normal -= desired * desired_normal.dot(desired)
            if desired_normal.length > 1e-5:
                desired_normal.normalize()
                angle = math.atan2(desired.dot(normal.cross(desired_normal)), normal.dot(desired_normal))
                rotate(rig, hand.name, desired, angle * hand_blend)


def curl(rig, side, finger, amount):
    """Curl toward the palm with a geometric joint axis instead of guessed bone Euler axes."""
    palm = rig.pose.bones['wrist.' + side]
    for segment in (1, 2, 3):
        pb = rig.pose.bones.get(f'finger{finger}-{segment}.{side}')
        if pb is None:
            continue
        along = (pb.tail - pb.head).normalized()
        # The palm normal follows the current wrist orientation. MPFB finger local X
        # is near its hinge, but sign is chosen from the actual palm-facing direction.
        axis = pb.matrix.to_3x3().col[0].normalized()
        palm_center = palm.head - pb.head
        if axis.cross(along).dot(palm_center) < 0:
            axis.negate()
        rotate(rig, pb.name, axis, amount * (.70 if segment == 1 else 1.0))


def head_motion(rig, pitch=0., yaw=0., roll=0.):
    for name, fraction in [('spine01', .1), ('neck01', .15), ('neck02', .15), ('neck03', .1), ('head', .5)]:
        rotate(rig, name, (1, 0, 0), pitch * fraction)
        rotate(rig, name, (0, 0, 1), yaw * fraction)
        rotate(rig, name, (0, -1, 0), roll * fraction)


def base_pose(rig):
    cached = _RELAXED.get(rig.as_pointer())
    if cached:
        for pb in rig.pose.bones: pb.matrix_basis = cached[pb.name].copy()
        bpy.context.view_layer.update()
        return
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for side, sign in [('L', 1), ('R', -1)]:
        arm(rig, side, (sign * .235, -.04, .935), (0, -.06, -1), pole_override=(sign * .2, -.55, -1))
        for finger in (2, 3, 4, 5):
            curl(rig, side, finger, .10)
    _RELAXED[rig.as_pointer()] = {pb.name:pb.matrix_basis.copy() for pb in rig.pose.bones}


def pose(rig, name, variant, t, duration):
    base_pose(rig)
    weight = envelope(t, duration)
    side = 'R' if variant == 1 else 'L'
    sign = -1 if side == 'R' else 1
    phase = t / duration
    breathe = math.sin(phase * math.tau) * weight
    rotate(rig, 'spine02', (1, 0, 0), .009 * breathe)
    if name.startswith('idle_'):
        beat = math.sin(phase * math.pi) ** 2
        if name == 'idle_breathe':
            head_motion(rig, pitch=.017 * math.sin(phase * math.tau) * weight)
        elif name.startswith('idle_glance'):
            direction = -1 if name.endswith('left') else 1
            look = smooth((phase - .14) / .16) * smooth((.86 - phase) / .17)
            head_motion(rig, yaw=direction * .24 * look, pitch=-.035 * beat)
        elif name == 'idle_shoulders':
            rotate(rig, 'shoulder01.L', (0, 1, 0), -.055 * beat)
            rotate(rig, 'shoulder01.R', (0, 1, 0), .045 * beat)
            head_motion(rig, roll=.035 * beat)
        elif name == 'idle_settle':
            rotate(rig, 'spine04', (0, -1, 0), .028 * beat)
            rotate(rig, 'spine02', (0, -1, 0), -.018 * beat)
            head_motion(rig, yaw=.06 * math.sin(phase * math.tau) * weight)
        elif name == 'idle_collar':
            reach = smooth((phase - .1) / .22) * smooth((.83 - phase) / .2)
            neutral, collar = Vector((-.235, -.04, .935)), Vector((-.14, -.20, 1.445))
            arm(rig, 'R', neutral.lerp(collar, reach), (0, .10, .98), hand_blend=reach, pole_override=(0, .1, -1))
            for finger in (3, 4, 5):
                curl(rig, 'R', finger, .33 * reach)
            head_motion(rig, pitch=.055 * reach, roll=-.025 * reach)
        return
    if weight < 1e-7: return
    # Every gesture begins and ends in the same relaxed base pose. The runtime
    # can turn these into additive layers using frame zero as the reference.
    if name in ('wave', 'thumbs_up', 'count_on_fingers'):
        target = Vector((sign * .38, -.20, 1.53))
        if name == 'thumbs_up': target = Vector((sign * .30, -.27, 1.32))
        if name == 'count_on_fingers': target = Vector((sign * .28, -.29, 1.36))
        origin = Vector((sign * .235, -.04, .935))
        arm(rig, side, origin.lerp(target, weight), (0, -1, 0) if name == 'thumbs_up' else (0, 0, 1), palm_front=name != 'thumbs_up', hand_blend=weight, palm_normal=(sign, 0, 0) if name == 'thumbs_up' else None)
        if name == 'wave':
            rotate(rig, 'wrist.' + side, (0, -1, 0), .15 * math.sin(t * (7.4 if variant == 1 else 6.4)) * weight)
            head_motion(rig, roll=-sign * .055 * weight)
        elif name == 'thumbs_up':
            for finger in (2, 3, 4, 5): curl(rig, side, finger, .95 * weight)
            thumb = rig.pose.bones['finger1-1.' + side]
            aim(rig, thumb.name, 'finger1-3.' + side, thumb.head + Vector((0, 0, .12)), weight)
        else:
            for finger in (3, 4, 5):
                reveal = smooth((phase - (.20 + (finger - 3) * .16)) / .06)
                curl(rig, side, finger, .85 * (1 - reveal) * weight)
            head_motion(rig, pitch=.04 * weight, yaw=sign * .06 * weight)
    elif name in ('open_palm_present', 'welcome_open_arms', 'shrug', 'beat_small', 'beat_big'):
        sides = [('L', 1), ('R', -1)] if name in ('welcome_open_arms', 'shrug', 'beat_big') else [(side, sign)]
        for active, s in sides:
            spread = .43 if name == 'welcome_open_arms' else .34
            height = 1.26 if name == 'shrug' else 1.20
            beat = math.sin(t * 6.3) * (.055 if name == 'beat_big' else .028) * weight if name.startswith('beat') else 0
            target = Vector((s * spread, -.25 - beat, height + beat))
            arm(rig, active, Vector((s * .235, -.04, .935)).lerp(target, weight), (s * .90, -.30, .08), hand_blend=weight, palm_normal=(0, 0, 1))
        if name == 'shrug':
            rotate(rig, 'shoulder01.L', (0, 1, 0), -.13 * weight)
            rotate(rig, 'shoulder01.R', (0, 1, 0), .13 * weight)
            head_motion(rig, roll=sign * .09 * weight)
        else: head_motion(rig, pitch=.035 * weight, yaw=sign * .05 * weight)
    elif name == 'hand_to_chin':
        target = Vector((sign * .055, -.20, 1.44))
        arm(rig, side, Vector((sign * .235, -.04, .935)).lerp(target, weight), (0, 0, 1), hand_blend=weight, pole_override=(0, .1, -1))
        for finger in (3, 4, 5): curl(rig, side, finger, .6 * weight)
        head_motion(rig, pitch=.055 * weight, yaw=-sign * .09 * weight)
    elif name == 'arms_crossed':
        for active, s in [('L', 1), ('R', -1)]:
            dominant = active == side
            target = Vector((-s * .15, -.26 if dominant else -.30, 1.29 if dominant else 1.245))
            arm(rig, active, Vector((s * .235, -.04, .935)).lerp(target, weight), (-s, 0, .15), hand_blend=weight)
            for finger in (2, 3, 4, 5): curl(rig, active, finger, .25 * weight)
        head_motion(rig, pitch=-.04 * weight, yaw=sign * .06 * weight)
    elif name == 'nod':
        head_motion(rig, pitch=.12 * math.sin(t * (5.2 if variant == 1 else 4.4)) * weight)
    elif name == 'head_shake':
        head_motion(rig, yaw=.18 * math.sin(t * (5.0 if variant == 1 else 4.0)) * weight)
    elif name == 'head_tilt':
        head_motion(rig, roll=sign * .15 * weight, yaw=sign * .04 * weight)
    elif name == 'laugh_body':
        bounce = math.sin(t * 10.5) * weight
        head_motion(rig, pitch=-.12 * weight + .022 * bounce, roll=sign * .035 * weight)
        rotate(rig, 'spine01', (1, 0, 0), -.025 * weight + .018 * bounce)
        rotate(rig, 'shoulder01.L', (0, 1, 0), -.030 * bounce)
        rotate(rig, 'shoulder01.R', (0, 1, 0), .033 * bounce)


def action_curves(action):
    if hasattr(action, 'fcurves'):
        yield from action.fcurves
    else:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    yield from bag.fcurves


def apply_actions(rig):
    if rig.type != 'ARMATURE': raise TypeError('An MPFB armature is required')
    required = ['spine01', 'spine02', 'spine04', 'head', 'neck01', 'neck02', 'neck03'] + [f'{part}.{side}' for side in ('L','R') for part in ('shoulder01','upperarm01','lowerarm01','wrist','finger2-1','finger2-3','finger5-1')]
    absent = [name for name in required if name not in rig.pose.bones]
    if absent: raise ValueError('Missing MPFB bones: ' + ', '.join(absent))
    _RELAXED.pop(rig.as_pointer(), None)
    animation = rig.animation_data_create()
    for track in list(animation.nla_tracks):
        if any(strip.action and strip.action.get(PREFIX) for strip in track.strips):
            animation.nla_tracks.remove(track)
    existing_action = animation.action
    existing_pose = {pb.name: pb.matrix_basis.copy() for pb in rig.pose.bones}
    animation.action = None
    selected = [pb for pb in rig.pose.bones if pb.name.startswith(('spine','neck','head','shoulder','upperarm','lowerarm','wrist','finger')) and pb.name != 'root']
    result = {'stage':'Authored motion studies; visual acceptance pending', 'fps': FPS, 'clips':[], 'notes':['No facial morphs or voice keyed. Runtime facial and speech layers remain independent.', 'Six different idles and two variants of all fourteen fixed gestures.', 'First/last frames share a relaxed arms-down reference pose. No root translation.', 'No dynamics or motion capture; shoulder/hand collisions still require visual review.']}
    bpy.context.scene.render.fps = FPS
    jobs = [(name, 0, duration) for name,duration in IDLES] + [(name, variant, 3.5 if name not in ('arms_crossed','hand_to_chin','count_on_fingers') else 4.5) for name in GESTURES for variant in (1,2)]
    for name, variant, duration in jobs:
        clip_name = name if name.startswith('idle_') else f'{name}_{variant}'
        old = bpy.data.actions.get(clip_name)
        if old and not old.get(PREFIX): raise ValueError('Refusing to replace an unrelated action: ' + clip_name)
        if old: bpy.data.actions.remove(old)
        action = bpy.data.actions.new(clip_name)
        action[PREFIX] = True
        action['visual_approval'] = 'pending'
        action['reference_pose'] = 'first_frame_relaxed'
        action.use_fake_user = True
        animation.action = action
        end = round(duration * FPS) + 1
        frames = sorted(set([1, end] + list(range(1, end + 1, 3))))
        for frame in frames:
            pose(rig, name, variant, (frame - 1) / FPS, duration)
            for pb in selected:
                pb.keyframe_insert('rotation_quaternion', frame=frame, group=pb.name)
        for curve in action_curves(action):
            for point in curve.keyframe_points:
                point.interpolation = 'BEZIER'
                point.handle_left_type = point.handle_right_type = 'AUTO_CLAMPED'
        track = animation.nla_tracks.new()
        track.name = clip_name
        strip = track.strips.new(clip_name, 1, action)
        strip.name = clip_name
        strip.extrapolation = 'NOTHING'
        strip.blend_type = 'REPLACE'
        strip.use_auto_blend = False
        track.mute = True
        result['clips'].append({'name':clip_name,'duration':duration,'keyframes':len(frames),'bones':len(selected)})
        animation.action = None
        print('AUTHORED', clip_name, duration, flush=True)
    animation.action = existing_action
    for pb in rig.pose.bones: pb.matrix_basis = existing_pose[pb.name]
    bpy.context.view_layer.update()
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    rig = next(ob for ob in bpy.context.scene.objects if ob.type == 'ARMATURE')
    report = apply_actions(rig)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output))
    if args.report: args.report.write_text(json.dumps(report, indent=2))
