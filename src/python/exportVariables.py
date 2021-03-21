result_points = json.dumps([
  pt.to_dict()
  for pt in global_points.values()
])

result_shapes = json.dumps([
  {
    "points": [pt.name for pt in shape.points],
    "faces_data": [
      {
        "normal": face['normal'].to_array(),
        "constant": face['constant'],
        "points": [
          pt.to_dict()
          for pt in face['points']
        ]
      }
      for face in shape.faces_data
    ]
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
