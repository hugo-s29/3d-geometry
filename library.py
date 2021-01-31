import math
import json

global_shapes = []
global_planes = []
global_points = {}
global_arrows = set()
global_lines  = set()

class Vector(object):

  @classmethod
  def Lerp(cls, a, b, s):
    return (1.0-s)*a + s*b

  @classmethod
  def Cross(cls, a, b):
    return a^b

  def __init__(self, *components):
    if len(components) == 1:
      self.components = list(components[0])
    else:
      self.components = list(map(float, components))
    if len(self.components) < 3:
      self.components.extend((0,)*3)

  @property
  def x(self):
    return self.components[0]

  @x.setter
  def x(self, value):
    self.components[0] = value

  @property
  def y(self):
    return self.components[1]

  @y.setter
  def y(self, value):
    self.components[1] = value

  @property
  def z(self):
    return self.components[2]

  @z.setter
  def z(self, value):
    self.components[2] = value

  def __getitem__(self, index):
    return self.components[index]

  def __setitem__(self, index, value):
    self.components[index] = value

  def __len__(self):
    return len(self.components)

  def __iter__(self):
    return iter(self.components)

  def __add__(self, other):
    return Vector(*(a+b for a,b in zip(self, other)))

  def __mul__(self, other):
    try:
      return sum(a*b for a,b in zip(self, other))
    except:
      return Vector(*(a*other for a in self))

  def __truediv__(self, k):
    return self * (1/k)

  def __rmul__(self, other):
    return self.__mul__(other)

  def __radd__(self, other):
    return self.__add__(other)

  def __sub__(self, other):
    return Vector(*(a-b for a,b in zip(self, other)))

  def __rsub__(self, other):
    return other + (-self)

  def __neg__(self, other):
    return Vector(*(-a for a in self))

  def __str__(self):
    return '<{}>'.format(', '.join(map(str, self)))

  def __eq__(self, other):
    return tuple(self) == tuple(other)

  def __ne__(self, other):
    return not self.__eq__(other)

  def __hash__(self):
    return hash(tuple(self))

  def __repr__(self):
    return str(self)

  def __xor__(a, b):
    return Vector(a.y*b.z - a.z*b.y,
                  a.z*b.x - a.x*b.z,
                  a.x*b.y - a.y*b.x)

  @property
  def mag2(self):
    return self*self

  @property
  def mag(self):
    return self.mag2**0.5

  @property
  def normalized(self):
    mag2 = self*self
    if mag2 == 0:
      return Vector()
    return Vector(*self) / mag2**0.5

  def to_array(self):
    return [c for c in self]

def normalize(v):
  return v.normalized

def cross(a,b):
  return Vector.Cross(a,b)

def vector(l):
  return Vector(*l)

class UnknownPointError(Exception):
  def __init__(self, point_name, function_name):
    self.point_name = point_name
    self.function_name = function_name
    Exception.__init__(self, "Unknow point '{point}' when calling function '{func}'".format(point=point_name, func=function_name))

class Point:
  def __init__(self, pos, name):
    self.position = pos
    self.name = name

class Shape:
  def __init__(self):
    self.points = []
  
  def sdf(self):
    return """
    float shapeSDF(vec3 p) {
        return 0.0;
    }
    """
  
  def geometry(self):
    return ["BoxGeometry", 2,2,2]

class Square(Shape):
  def __init__(self, points_names):
    self.points = []

    square = [
      vector([-1.0,-1.0,0.0]),
      vector([+1.0,-1.0,0.0]),
      vector([+1.0,+1.0,0.0]),
      vector([-1.0,+1.0,0.0]),
    ]
    for i in range(4):
      name= points_names[i]
      pt = Point(square[i], name)
      self.points.append(pt)
      global_points[name] = pt
    
    for k in range(4):
      i = k
      j = (k+1) % 4
      line(points_names[i] + point_names[j])
    
    global_shapes.append(self)
    
  def geometry(self):
    return ["BoxGeometry", 2,2,0]

class Box(Shape):
  def __init__(self, points_names, w, h, d):
    self.points = []

    self.size = [w,h,d]

    square = [
      vector([-w/2.0,-h/2.0,0.0]),
      vector([+w/2.0,-h/2.0,0.0]),
      vector([+w/2.0,+h/2.0,0.0]),
      vector([-w/2.0,+h/2.0,0.0]),
    ]

    for i in range(8):
      z = -d/2.0 if i // 4 == 0 else d/2.0
      pos = square[i % 4] + vector([0.0,0.0,z])
      name = points_names[i]
      pt = Point(pos, name)
      self.points.append(pt)
      global_points[name] = pt

    faces = [
      "0123",
      "4567",
      "0154",
      "1265",
      "7623",
      "4730",
    ]

    for face in faces:
      for k in range(4):
        i = int(face[k]       )
        j = int(face[(k+1) % 4] )
        line(points_names[i] + points_names[j])

    global_shapes.append(self)

  def geometry(self):
    w,h,d = self.size
    return ["BoxGeometry", w,h,d]

  def sdf(self):
    w,h,d = [str(f/2.0) for f in self.size]
    return """
    float vmax(vec3 v) {
        return max(max(v.x, v.y), v.z);
    }

    float shapeSDF(vec3 p) {
        return vmax(abs(p) - vec3(@w@,@h@,@d@));
    }

    """.replace('@w@', w).replace('@h@', h).replace('@d@', d)

class Cube(Box):
  def __init__(self, points):
    Box.__init__(self, points, 2.0, 2.0, 2.0)

def point(name, func="point"):
  try:
    return global_points[name]
  except KeyError:
    err = UnknownPointError(name, func)
    global global_error
    global_error = err
    raise err

def vec(name):
  _a, _b = name
  
  a = point(_a, "vec").position
  b = point(_b, "vec").position

  return b-a

def pointFromVec(vecName, expression, fixed = None, func="pointFromVec"):
  a,b = vecName
  u,v = b, a
  
  if u in global_points.keys():
    u,v = a,b
    expression *= -1
  
  if not fixed is None:
    if u == fixed:
      u,v = v,u
    
  pt = Point(point(v, 'pointFromVec').position + expression, u)
  global_points[u] = pt
  return pt

def midPoint(name, points):
  return pointFromVec(points[0] + name, 0.5 * vec(points), fixed=points[0], func="midPoint")

# class Pyramid(Shape):
#   def __init__(self, points, base=Square):
#     self.points = []
    
#     vertex = Point(points[0], Vector(0,0,1))
#     self.points.append(vertex)
    
#     for i,name in enumerate(points):
      
    

class Plane(Shape):
  def __init__(self, a, b, c,size):
    self.a = a
    self.b = b
    self.c = c
    self.size = size
    self.points = [a, b, c]
    global_planes.append(self)

  def get_normal(self):
    a, b, c = [pt.position for pt in self.points]
    direction = cross(b - a, c - a)
    return normalize(direction)

  def values(self, section = False):
    normal = self.get_normal().to_array()
    points = [pt.position.to_array() for pt in self.points]

    return [normal] + points + [section, self.size]

class Section(Plane):
  def values(self):
    return Plane.values(self, True)


def plane(name, section = False, size=1):
  a = point(name[0], 'plane')
  b = point(name[1], 'plane')
  c = point(name[2], 'plane')

  return Plane(a, b, c,size) if not section else Section(a,b,c,size)

def line(points):
  a,b = points
  line = [
    point(a, 'line'),
    point(b, 'line'),
  ]

  global_lines.add(points)
  return line

def arrow(points):
  a,b = points
  point(a, 'arrow')
  point(b, 'arrow')
  
  global_arrows.add(points)
  
  return [a,b]

def showVector(points):
  return arrow(points)


result_rotate = 1.0

def rotate(speed=1.0):
  global result_rotate
  result_rotate = speed

def dontRotate():
  global result_rotate
  result_rotate = 0