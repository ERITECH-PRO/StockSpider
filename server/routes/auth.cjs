@@ .. @@
 const jwt = require('jsonwebtoken');
 const { v4: uuidv4 } = require('crypto');
-const db = require('../database');
-const config = require('../config');
+const db = require('../database.cjs');
+const config = require('../config.cjs');