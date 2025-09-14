# Modern Overlay Components

Modern glass-effect overlay components untuk PlazaCMS dengan backdrop blur dan animasi smooth.

## Components

### 1. ModernOverlay

Main wrapper untuk modal/overlay dengan backdrop blur dan click-outside handling.

```tsx
<ModernOverlay
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  size="lg"
  intensity="medium"
>
  <ModernModalHeader
    title="Upload Media"
    subtitle="Select files to upload"
    onClose={() => setShowModal(false)}
  />
  <ModernModalContent>{/* Modal content */}</ModernModalContent>
  <ModernModalFooter>
    <Button variant="ghost" onClick={() => setShowModal(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleSave}>
      Save
    </Button>
  </ModernModalFooter>
</ModernOverlay>
```

### 2. GlassHoverOverlay

Untuk hover effects pada images/cards.

```tsx
<div className="relative group">
  <img src="..." />
  <GlassHoverOverlay intensity="medium">
    <div className="flex gap-2">
      <GlassButton variant="primary" size="sm">
        Preview
      </GlassButton>
      <GlassButton variant="secondary" size="sm">
        Edit
      </GlassButton>
    </div>
  </GlassHoverOverlay>
</div>
```

## Props

### ModernOverlay

- `isOpen: boolean` - Show/hide modal
- `onClose: () => void` - Close handler
- `size: "sm" | "md" | "lg" | "xl" | "full"` - Modal size
- `intensity: "light" | "medium" | "dark"` - Backdrop intensity
- `closeOnClickOutside?: boolean` - Enable click outside to close

### GlassHoverOverlay

- `intensity: "light" | "medium" | "dark"` - Overlay intensity
- `children: ReactNode` - Content to show on hover

### GlassButton

- `variant: "primary" | "secondary" | "danger"` - Button style
- `size: "sm" | "md"` - Button size

## Design Features

### ✨ Glass Effect

- Semi-transparent backgrounds with `bg-white/95`
- Backdrop blur with `backdrop-blur-md`
- Border with `border-white/20`

### 🎭 Smooth Animations

- Fade-in overlay: `animate-in fade-in-0 duration-300`
- Zoom-in modal: `animate-in zoom-in-95 duration-300`
- Hover transitions: `transition-all duration-300`

### 🎨 Modern Gradients

- Hover overlays: `bg-gradient-to-t from-black/60 via-transparent`
- Professional glass look instead of solid black

### 📱 Responsive

- Auto-sizing with max-width constraints
- Mobile-friendly padding and spacing
- Touch-friendly button sizes

## Migration from Old Overlays

### Before (Old Style)

```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 z-50">
  <div className="bg-white rounded-lg shadow-xl">{/* content */}</div>
</div>
```

### After (Modern Style)

```tsx
<ModernOverlay isOpen={true} onClose={onClose}>
  <ModernModalHeader title="Title" onClose={onClose} />
  <ModernModalContent>{/* content */}</ModernModalContent>
</ModernOverlay>
```

## Usage Examples

Sudah diimplementasikan di:

- ✅ MediaPicker
- ✅ UploadModal
- ✅ ImageEditor
- ✅ AdminSidebar (mobile overlay)
- ✅ CategoriesManager
- ✅ AttributesManager
- ✅ MediaGrid hover effects

## Color Palette

- Backdrop: `bg-black/20` dengan `backdrop-blur-sm`
- Modal: `bg-white/95` dengan `backdrop-blur-md`
- Borders: `border-white/20`
- Shadows: `shadow-2xl`
- Hover gradients: `from-black/60 via-transparent`
