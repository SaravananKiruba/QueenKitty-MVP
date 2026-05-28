<?php
/**
 * verify_seller_groups.php
 * 
 * Verify that seller groups migration was applied successfully.
 * Run: php scripts/verify_seller_groups.php
 */

require_once __DIR__ . '/../api/config/database.php';

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo " QueenKitty — Seller Groups Migration Verification\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$db = db();

// Check 1: seller_groups table exists
echo "✓ Checking seller_groups table...\n";
try {
    $stmt = $db->query("SHOW TABLES LIKE 'seller_groups'");
    $exists = $stmt->rowCount() > 0;
    if ($exists) {
        echo "  ✅ seller_groups table exists\n";
        
        // Count groups
        $stmt = $db->query("SELECT COUNT(*) as count FROM seller_groups");
        $count = $stmt->fetch()['count'];
        echo "  📊 Total groups: $count\n";
        
        // List groups
        if ($count > 0) {
            $stmt = $db->query("SELECT id, name, category FROM seller_groups LIMIT 5");
            $groups = $stmt->fetchAll();
            foreach ($groups as $g) {
                echo "     • {$g['name']} (ID: {$g['id']}, Category: {$g['category']})\n";
            }
        }
    } else {
        echo "  ❌ seller_groups table NOT found\n";
        echo "     Run: php database/migrate.php\n";
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Check 2: users.group_id column exists
echo "✓ Checking users.group_id column...\n";
try {
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'group_id'");
    $exists = $stmt->rowCount() > 0;
    if ($exists) {
        echo "  ✅ users.group_id column exists\n";
        
        // Count sellers per group
        $stmt = $db->query("SELECT group_id, COUNT(*) as count FROM users WHERE group_id IS NOT NULL GROUP BY group_id");
        $counts = $stmt->fetchAll();
        if (count($counts) > 0) {
            echo "  📊 Sellers per group:\n";
            foreach ($counts as $c) {
                echo "     • Group {$c['group_id']}: {$c['count']} sellers\n";
            }
        } else {
            echo "  ⚠️  No sellers assigned to groups yet\n";
            echo "     Run: UPDATE users SET group_id = 1 WHERE phone = 'your_phone';\n";
        }
    } else {
        echo "  ❌ users.group_id column NOT found\n";
        echo "     Run: php database/migrate.php\n";
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Check 3: products.group_id column exists
echo "✓ Checking products.group_id column...\n";
try {
    $stmt = $db->query("SHOW COLUMNS FROM products LIKE 'group_id'");
    $exists = $stmt->rowCount() > 0;
    if ($exists) {
        echo "  ✅ products.group_id column exists\n";
        
        // Count products by type
        $stmt = $db->query("
            SELECT 
                CASE 
                    WHEN user_id IS NULL AND group_id IS NULL THEN 'Global'
                    WHEN user_id IS NULL AND group_id IS NOT NULL THEN 'Group'
                    ELSE 'Custom'
                END as type,
                COUNT(*) as count
            FROM products
            WHERE is_active = 1
            GROUP BY type
        ");
        $counts = $stmt->fetchAll();
        if (count($counts) > 0) {
            echo "  📊 Product breakdown:\n";
            foreach ($counts as $c) {
                echo "     • {$c['type']}: {$c['count']} products\n";
            }
        } else {
            echo "  ⚠️  No products found\n";
            echo "     Run migration: 014_seed_sample_seller_groups.sql\n";
        }
    } else {
        echo "  ❌ products.group_id column NOT found\n";
        echo "     Run: php database/migrate.php\n";
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Check 4: Sample data integrity
echo "✓ Checking data integrity...\n";
try {
    // Check if sample groups have products
    $stmt = $db->query("
        SELECT sg.name, COUNT(p.id) as product_count
        FROM seller_groups sg
        LEFT JOIN products p ON p.group_id = sg.id
        GROUP BY sg.id, sg.name
    ");
    $groupProducts = $stmt->fetchAll();
    if (count($groupProducts) > 0) {
        echo "  📦 Products per group:\n";
        foreach ($groupProducts as $gp) {
            echo "     • {$gp['name']}: {$gp['product_count']} products\n";
        }
    }
} catch (Exception $e) {
    echo "  ⚠️  Could not check integrity: " . $e->getMessage() . "\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo " ✅ Verification Complete\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "\n";

// Summary
$allGood = true;
try {
    $stmt = $db->query("SHOW TABLES LIKE 'seller_groups'");
    if ($stmt->rowCount() === 0) $allGood = false;
    
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'group_id'");
    if ($stmt->rowCount() === 0) $allGood = false;
    
    $stmt = $db->query("SHOW COLUMNS FROM products LIKE 'group_id'");
    if ($stmt->rowCount() === 0) $allGood = false;
} catch (Exception $e) {
    $allGood = false;
}

if ($allGood) {
    echo "✅ All migrations applied successfully!\n";
    echo "📝 Next steps:\n";
    echo "   1. Assign sellers to groups: UPDATE users SET group_id = ? WHERE ...\n";
    echo "   2. Upload group products via SQL or wait for admin UI\n";
    echo "   3. Test product visibility in React app\n";
} else {
    echo "❌ Some migrations are missing\n";
    echo "📝 Run: php database/migrate.php\n";
}

echo "\n";
