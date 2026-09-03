import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageNodeView } from '@/features/documents/ui/ResizableImageNodeView'

export const ResizableDocumentImage = Node.create({
  name: 'documentImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      storageKey: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-storage-key'),
        renderHTML: (attributes) =>
          attributes.storageKey ? { 'data-storage-key': attributes.storageKey } : {},
      },
      alt: { default: null },
      title: { default: null },
      width: { default: 280 },
      height: { default: null },
      dataQr: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-qr'),
        renderHTML: (attributes) => (attributes.dataQr ? { 'data-qr': attributes.dataQr } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: 'document-tiptap-image' })]
  },

  addCommands() {
    return {
      insertDocumentImage:
        (attrs: {
          src: string
          storageKey?: string | null
          width?: number
          height?: number | null
          alt?: string | null
          dataQr?: string | null
        }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView)
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentImage: {
      insertDocumentImage: (attrs: {
        src: string
        storageKey?: string | null
        width?: number
        height?: number | null
        alt?: string | null
        dataQr?: string | null
      }) => ReturnType
    }
  }
}
