@@ .. @@
 const { v4: uuidv4 } = require('crypto');
-const db = require('../database');
-const auth = require('../middleware/auth');
+const db = require('../database.cjs');
+const auth = require('../middleware/auth.cjs');