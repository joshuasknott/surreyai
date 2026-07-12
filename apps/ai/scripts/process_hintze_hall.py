"""Prepare David Fletcher's Hintze Hall OBJ for browser optimisation.

Run with Blender 5.1+:
  blender --background --python process_hintze_hall.py -- \
    --source-dir <extracted-original-dir> --output-dir <temporary-output-dir>

The script never opens or changes the downloaded archive. It imports an extracted
working copy, places the lowest captured surface at y=0 in glTF space, preserves
the baked-colour texture mapping, exports a lossless intermediate GLB, and writes
the separately authored collision envelope used by the browser experience.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector


MODEL_STEM = "NHMHintzeHall01"


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args(argv)


def world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return (
        Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))),
        Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points))),
    )


def main() -> None:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    obj_path = source_dir / f"{MODEL_STEM}.obj"
    mtl_path = source_dir / f"{MODEL_STEM}.mtl"
    textures = sorted(source_dir.glob("NHMHintzeHall02_*_diffuse.jpg"))
    if not obj_path.is_file() or not mtl_path.is_file() or len(textures) != 2:
        raise FileNotFoundError("Expected one OBJ, one MTL, and two source diffuse atlases")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.obj_import(filepath=str(obj_path), forward_axis="Y", up_axis="Z")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one imported scan mesh, found {len(meshes)}")

    scan = meshes[0]
    scan.name = "Hintze Hall photogrammetry - David Fletcher artfletch"
    scan.data.name = "Hintze Hall captured mesh"
    minimum, maximum = world_bounds(meshes)
    source_floor_z = float(minimum.z)
    scan.location.z -= source_floor_z
    bpy.context.view_layer.objects.active = scan
    scan.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    # The source photographs already contain the Hall's illumination. Keep the
    # texture as sRGB base colour with a neutral, fully rough response; runtime
    # converts it to unlit MeshBasicMaterial to avoid contradictory shadows.
    for material in bpy.data.materials:
        material.use_nodes = True
        principled = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
        if principled:
            principled.inputs["Roughness"].default_value = 1.0
            principled.inputs["Metallic"].default_value = 0.0
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                node.image.colorspace_settings.name = "sRGB"

    intermediate = output_dir / "hintze-hall-source-normalized.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(intermediate),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_attributes=False,
        export_cameras=False,
        export_lights=False,
    )

    # A deliberately conservative central-nave route. It blocks side exhibits,
    # the defective north-east gorilla corner, stairs, scan boundaries, and the
    # large central plinth. Runtime treats the player as a 0.34 m radius capsule.
    collision = {
        "version": 1,
        "coordinateSystem": "glTF Y-up, metres",
        "player": {"radius": 0.34, "eyeHeight": 1.70, "walkSpeed": 2.35, "fastWalkSpeed": 3.45},
        "floorY": 0.0,
        "walkableBounds": {"minX": -4.25, "maxX": 4.25, "minZ": -16.8, "maxZ": 4.4},
        "blockedBoxes": [
            {"id": "central-display", "minX": -1.15, "maxX": 1.15, "minZ": -2.0, "maxZ": -0.15},
            {"id": "north-east-conservation-boundary", "minX": 3.82, "maxX": 4.25, "minZ": -16.8, "maxZ": -10.8},
            {"id": "north-west-display-boundary", "minX": -4.25, "maxX": -3.82, "minZ": -16.8, "maxZ": -11.2},
        ],
        "spawn": {"x": 0.0, "y": 1.70, "z": -15.25, "yaw": 3.141592653589793},
        "supportedArea": "Central ground-floor nave from the north entrance to the foot of the principal staircase; stairs, landings, side aisles, and north-east exhibit are closed.",
    }
    (output_dir / "hintze-hall-collision-v1.json").write_text(json.dumps(collision, indent=2) + "\n", encoding="utf-8")

    minimum_after, maximum_after = world_bounds(meshes)
    stats = {
        "source": str(obj_path),
        "objects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(obj.data.polygons) for obj in meshes),
        "materials": len(scan.material_slots),
        "sourceFloorZ": source_floor_z,
        "normalizedBounds": {"min": list(minimum_after), "max": list(maximum_after)},
        "intermediate": str(intermediate),
        "intermediateBytes": intermediate.stat().st_size,
    }
    (output_dir / "hintze-hall-blender-stats.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print("HINTZE_HALL_PROCESSING=" + json.dumps(stats))


if __name__ == "__main__":
    main()
