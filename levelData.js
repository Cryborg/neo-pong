// Level data for Solo mode
const LEVEL_DATA = {
    1: `# MAPPING
R = 3 #ff0000
B = 2 #8b4513
S = 1 #ffdbac
G = 2 #00ff00
Y = 2 #ffff00
K = 1 #000000
W = 1 #ffffff
# ENDMAPPING

# LEVEL
'     RRRRRR         '
'    RRRRRRRR        '
'    BBBSSBBBB       '
'   BSBSSSSBSB       '
'   BSBBSSSSBB       '
'   BSSSSSSSSB       '
'    SSRRRRSS        '
'   SSRRRRRRRSS      '
'   SSRRRRRRRSS      '
'   SSRRRRRRRSS      '
'    BBRRRRRBB       '
'   BBBRRRRRRBBB     '
'  BBBRRRRRRRRBBB    '
'  BBBWWWWWWWWBBB    '
'     WWWWWWW        '
'    WW  WW  WW      '
# ENDLEVEL`,

    2: `# MAPPING
X = 1 #ff9ff3
Y = 2 #54a0ff
Z = 3 #5f27cd
W = 4 #00d2d3
V = 5 #ff6348
I = indestructible #2f3542
# ENDMAPPING

# LEVEL
'XXXXXXXXXXXXXXX'
'X             X'
'X  YYY   YYY  X'
'X  YZY   YZY  X'
'X  YYY   YYY  X'
'X             X'
'X    WWWWW    X'
'X    WVVVW    X'
'X    WVIVW    X'
'X    WVVVW    X'
'X    WWWWW    X'
'X             X'
# ENDLEVEL`,

    3: `# MAPPING
A = 1 #fdcb6e
B = 2 #e17055
C = 3 #74b9ff
D = 4 #a29bfe
E = 5 #fd79a8
I = indestructible #636e72
# ENDMAPPING

# LEVEL
      A     
     AAA    
    AABAA   
   AABBAA   
  AABBBBAA  
 AABBBCBBAA 
AABBBBCBBBAA
ABBBBCDCBBBA
ABBBBCDCBBBA
AABBBBCBBBAA
 AABBBCBBAA 
  AABBBBAA  
# ENDLEVEL`,

    4: `# MAPPING
W = 1 #fab1a0
X = 2 #00b894
Y = 3 #0984e3
Z = 4 #6c5ce7
Q = 5 #fd79a8
I = indestructible #2d3436
# ENDMAPPING

# LEVEL
       W       
      WWW      
     WXIXW     
    WXXXXXXW   
   WXXXXXXXXW  
  WXXYYYYXXXXW 
 WXXYYYZYYXXXW 
WXXYYYZIZYYXXXW
WXXYYYZQZYYXXXW
 WXXYYYYXXXXW 
  WXXXXXXXXW  
   WXXXXXXW   
# ENDLEVEL`,

    5: `# MAPPING
H = 1 #ff7675
E = 2 #74b9ff
X = 3 #55a3ff
A = 4 #fd79a8
G = 5 #fdcb6e
O = 6 #00b894
I = indestructible #2d3436
# ENDMAPPING

# LEVEL
   HHHHHH   
  HEEEEEEEH  
 HEXXXXXXEH 
HEXAAAAAAAAXEH
EXAGGGGGGAXE
EXAGOIOGAXE
EXAGGGGGGAXE
HEXAAAAAAAAXEH
 HEXXXXXXEH 
  HEEEEEEEH  
   HHHHHH   
# ENDLEVEL`,

    6: `# Spiral challenge
# MAPPING
. = 1 #ff9ff3
o = 2 #54a0ff
O = 3 #5f27cd
@ = 4 #00d2d3
# = 5 #ff6348
I = indestructible #2f3542
# ENDMAPPING

# LEVEL
...............
.ooooooooooooo.
.o###########o.
.o#OOOOOOOOO#o.
.o#O@@@@@@@O#o.
.o#O@     @O#o.
.o#O@  I  @O#o.
.o#O@     @O#o.
.o#O@@@@@@@O#o.
.o#OOOOOOOOO#o.
.o###########o.
.ooooooooooooo.
...............
# ENDLEVEL`,

    7: `# Heart pattern
# MAPPING
L = 1 #ff7675
O = 2 #fd79a8
V = 3 #fdcb6e
E = 4 #55a3ff
I = indestructible #2d3436
# ENDMAPPING

# LEVEL
  LLL   LLL  
 LLLLL LLLLL 
LLLLLLLLLLLLL
LLLLLLLLLLLLL
 LLLLOOLLLL  
  LLLOVELL   
   LLOVELL   
    LOVELL    
     OVELL     
      VEL      
       EL       
        L        
# ENDLEVEL`,

    8: `# Advanced fortress
# MAPPING
W = 1 #ddd
X = 2 #bbb
Y = 3 #999
Z = 4 #777
Q = 5 #555
R = 6 #333
S = 7 #ff6b6b
T = 8 #4ecdc4
U = 9 #45b7d1
I = indestructible #2d3436
# ENDMAPPING

# LEVEL
WWWWWWWWWWWWWWW
WXXXXXXXXXXXW
WXYYYYYYYXXXXW
WXYZZZZZYXXXW
WXYZQQQZYYXXW
WXYZQRSQZYYXW
WXYZQSTSZQYXW
WXYZQSUISZQYXW
WXYZQSTSZQYXW
WXYZQRSQZYYXW
WXYZQQQZYYXXW
WXYZZZZZYXXXW
WXYYYYYYYXXXXW
WXXXXXXXXXXXW
WWWWWWWWWWWWWWW
# ENDLEVEL`,

    9: `# Maze challenge with corridors
# MAPPING
W = 1 #2d3436
P = 3 #ff6b6b
T = 5 #4ecdc4
G = 7 #45b7d1
D = 9 #ffeaa7
I = indestructible #000
# ENDMAPPING

# LEVEL
'WWWWWWWWWWWWWWW'
'W   P   T   G W'
'W W W W W W W W'
'W   W   W   W W'
'W WWW W WWW W W'
'W   T W P   W W'
'W W W W W WWW W'
'W W   W     T W'
'W WWWWWWWWW W W'
'W         W   W'
'W WWWWWWW W W W'
'W P     W   G W'
# ENDLEVEL`,

    10: `# Ultimate boss
# MAPPING
. = 1 #ff9999
o = 3 #ffaa99
O = 5 #ffcc99
@ = 7 #99ff99
# = 9 #99ffff
$ = 12 #9999ff
% = 15 #ff99ff
I = indestructible #000
# ENDMAPPING

# LEVEL
...............
.ooooooooooooo.
.o###########o.
.o#OOOOOOOOO#o.
.o#O@@@@@@@O#o.
.o#O@#####@O#o.
.o#O@#$$$#@O#o.
.o#O@#$%$#@O#o.
.o#O@#$I$#@O#o.
.o#O@#$$$#@O#o.
.o#O@#####@O#o.
.o#O@@@@@@@O#o.
.o#OOOOOOOOO#o.
.o###########o.
.ooooooooooooo.
...............
# ENDLEVEL`
};

// Get level data by level number
function getLevelData(levelNumber) {
    return LEVEL_DATA[levelNumber] || null;
}