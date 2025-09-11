@@ .. @@
 const express = require('express');
-const db = require('../database');
-const auth = require('../middleware/auth');
+const db = require('../database.cjs');
+const auth = require('../middleware/auth.cjs');