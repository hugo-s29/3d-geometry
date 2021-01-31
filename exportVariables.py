result_points = json.dumps([
  [pt.name] + pt.position.to_array()
  for pt in global_points.values()
])

result_shapes = json.dumps([
  {
    "points": [pt.name for pt in shape.points],
    "geometry": shape.geometry(),
    "sdf": shape.sdf()
  }
  for shape in global_shapes
])

result_planes = json.dumps([
  plane.values()
  for plane in global_planes
])

result_lines = json.dumps([
  line for line in global_lines
])

result_arrows = json.dumps([
  arrow for arrow in global_arrows
])
