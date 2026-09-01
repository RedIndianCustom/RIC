# 🗺️ Warehouse Staff Routes - Quick Reference

## 🎯 Primary Routes (Updated)

| Route | Component | Description | Access |
|-------|-----------|-------------|--------|
| `/dashboard` | Dashboard | Main warehouse dashboard | WH, M, A |
| `/scan-products` ⭐ | ScanProductsEnhanced | Advanced scanner with camera | WH, M, A |
| `/warehouse/scan` ⭐ | ScanProductsEnhanced | Same as above (alias) | WH, M, A |
| `/receiving` | ReceivingEnhanced | Process incoming shipments | WH, M, A |
| `/picking` | Picking | Order picking | WH, SA, M, A |
| `/packing` | Packing | Packing station | WH, M, A |
| `/inspection` | Inspection | Quality inspection | WH, M, A |
| `/inventory` | Inventory | Stock management | A, M, WH, OP |
| `/inventory/count` | InventoryCount | Cycle counting | WH, A |
| `/location-lookup` | LocationLookup | Find items | WH, A |

**Legend:**
- WH = Warehouse Staff
- M = Manager
- A = Admin
- SA = Sales Staff
- OP = Operational Staff
- ⭐ = Recently updated/enhanced

---

## 🚀 Quick Access URLs

### For Development:
```
http://localhost:3000/scan-products
http://localhost:3000/warehouse/scan
http://localhost:3000/receiving
http://localhost:3000/dashboard
```

### For Production:
```
https://yourdomain.com/scan-products
https://yourdomain.com/warehouse/scan
https://yourdomain.com/receiving
https://yourdomain.com/dashboard
```

---

## 📱 Mobile-Friendly Routes

These routes are optimized for mobile/tablet use:

1. **`/scan-products`** ⭐
   - Full camera support
   - Touch-friendly UI
   - Responsive camera viewport
   - Pinch-to-zoom

2. **`/receiving`**
   - Large touch targets
   - Simplified workflow
   - Quick actions

3. **`/picking`**
   - Pick list display
   - Scan verification
   - Clear instructions

---

## 🔗 Navigation Paths

### From Dashboard → Scan Products:
```
Option 1 (Hero):
Dashboard → Click "Scan Products" button → /scan-products

Option 2 (Inventory Card):
Dashboard → Inventory & Scanning → Scan Products → /scan-products

Option 3 (Direct):
Type URL: /scan-products or /warehouse/scan
```

### From Scan Products → Back:
```
Option 1:
Scan Products → Browser back button → Dashboard

Option 2:
Scan Products → Dashboard link (if added to header)
```

---

## ⚙️ Route Configuration

### In `AppRoutes.jsx`:
```jsx
// Warehouse Staff Routes
<Route element={<RoleRoute allowed={[WH, M, A]} />}>
  <Route path="/receiving"           element={<ReceivingEnhanced />} />
  <Route path="/warehouse/scan"      element={<ScanProductsEnhanced />} />
  <Route path="/scan-products"       element={<ScanProductsEnhanced />} />
  <Route path="/inspection"          element={<Inspection />} />
  <Route path="/packing"             element={<Packing />} />
  <Route path="/picking/fifo"        element={<FifoPicking />} />
  <Route path="/picking/discrepancy" element={<PickingDiscrepancy />} />
</Route>
```

---

## 🎨 Dashboard Links

### Current Implementation:
```jsx
// Hero Section
<Link to="/scan-products" className="...">
  <ScanBarcode className="w-4 h-4" />
  Scan Products
</Link>

// Inventory Card
<Link to="/scan-products" className="...">
  <span className="flex items-center gap-2">
    <ScanBarcode className="w-4 h-4 text-amber-600" />
    Scan Products
  </span>
  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
</Link>
```

---

## 🔄 Alternative Route Names (Future)

Consider these aliases for better UX:

| Current | Alternative | Reason |
|---------|-------------|--------|
| `/scan-products` | `/scanner` | Shorter URL |
| `/warehouse/scan` | `/scan` | Simpler |
| `/inventory/count` | `/count` | Direct |
| `/location-lookup` | `/find` | Easier to remember |

---

## 📊 Route Analytics

Track these metrics for each route:

| Route | Daily Visits | Avg. Session | Bounce Rate |
|-------|-------------|--------------|-------------|
| `/scan-products` | TBD | TBD | TBD |
| `/receiving` | TBD | TBD | TBD |
| `/picking` | TBD | TBD | TBD |
| `/packing` | TBD | TBD | TBD |

---

## 🐛 Troubleshooting

### Route Not Found (404)
1. Check if route is defined in `AppRoutes.jsx`
2. Verify user has correct role (WH, M, A)
3. Check for typos in URL
4. Verify component import path

### Access Denied
1. Check `RoleRoute` configuration
2. Verify user role in database
3. Check JWT token validity
4. Review permissions matrix

### Component Not Loading
1. Check component import path
2. Verify component exists in directory
3. Check for syntax errors in component
4. Review browser console for errors

---

## 📝 Developer Notes

### Adding New Route:
```jsx
// 1. Import component
import NewFeature from '../pages/dashboard/warehouse/NewFeature.jsx';

// 2. Add route
<Route element={<RoleRoute allowed={[WH, M, A]} />}>
  <Route path="/new-feature" element={<NewFeature />} />
</Route>

// 3. Add dashboard link
<Link to="/new-feature">New Feature</Link>

// 4. Test access with different roles
```

### Updating Existing Route:
```jsx
// 1. Update component import
import ScanProductsEnhanced from '../pages/.../ScanProductsEnhanced.jsx';

// 2. Update route element
<Route path="/scan-products" element={<ScanProductsEnhanced />} />

// 3. Update all links referencing this route

// 4. Test thoroughly
```

---

## 🎯 Best Practices

### Route Naming:
- ✅ Use kebab-case: `/scan-products`
- ✅ Be descriptive: `/inventory/count`
- ✅ Keep hierarchy: `/warehouse/scan`
- ❌ Avoid abbreviations: `/inv/cnt`
- ❌ Avoid underscores: `/scan_products`

### Component Naming:
- ✅ Use PascalCase: `ScanProductsEnhanced`
- ✅ Add version suffix: `Enhanced`, `V2`
- ✅ Keep organized: `warehouse/` folder
- ❌ Generic names: `Scanner`, `Page1`

### Link Implementation:
- ✅ Use `<Link>` from react-router
- ✅ Add aria-labels for accessibility
- ✅ Show active state
- ❌ Use `<a href>` (causes page reload)
- ❌ Use `window.location` (breaks routing)

---

## 📚 Related Documentation

- [Warehouse Staff Enhancement Plan](./WAREHOUSE_STAFF_ENHANCEMENT_PLAN.md)
- [Scan Products Enhancement Summary](./SCAN_PRODUCTS_ENHANCEMENT_SUMMARY.md)
- [Warehouse Sidebar Navigation](./WAREHOUSE_SIDEBAR_NAVIGATION.md)
- [Before & After Comparison](./BEFORE_AFTER_COMPARISON.md)
- [API Endpoints Reference](./API_STATUS.md)

---

## 🆘 Support

Need help? Check these resources:

1. **User Guide**: See dashboard help section
2. **API Docs**: `/api/docs` (if available)
3. **Developer Chat**: Team Slack channel
4. **Issue Tracker**: GitHub Issues
5. **Email Support**: support@company.com

---

**Last Updated**: Just now  
**Maintained By**: Development Team  
**Version**: 2.0.0
