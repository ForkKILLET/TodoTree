import { computed, nextTick, ref, watch, type ComponentPublicInstance, type Ref } from 'vue'
import { marked } from 'marked'
import TurndownService from 'turndown'

interface UseTodoContentEditorOptions {
  sourceContent: Ref<string>
  defaultMarkdownMode: Ref<boolean>
  autoSubmitOnBlur: Ref<boolean>
  onSave: (content: string) => void
}

export function useTodoContentEditor(options: UseTodoContentEditorOptions) {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
  })

  const isEditing = ref(false)
  const editMode = ref<'wysiwyg' | 'markdown'>('wysiwyg')
  const editContent = ref('')
  const editInput = ref<HTMLElement | null>(null)
  const markdownInput = ref<HTMLTextAreaElement | null>(null)

  const renderedContent = computed(() => {
    try {
      const parsed = marked.parse(options.sourceContent.value, { async: false })
      return parsed.trim()
    }
    catch {
      return options.sourceContent.value
    }
  })

  const renderedEditContent = computed(() => {
    try {
      const content = marked.parse(editContent.value, { async: false }) as string
      return content.replace(/\n/g, '')
    }
    catch {
      return editContent.value
    }
  })

  const setEditInputRef = (target: Element | ComponentPublicInstance | null) => {
    if (target instanceof HTMLElement) {
      editInput.value = target
      return
    }

    const root = target && '$el' in target ? target.$el : null
    editInput.value = root instanceof HTMLElement ? root : null
  }

  const setMarkdownInputRef = (target: Element | ComponentPublicInstance | null) => {
    if (target instanceof HTMLTextAreaElement) {
      markdownInput.value = target
      return
    }

    const root = target && '$el' in target ? target.$el : null
    markdownInput.value = root instanceof HTMLTextAreaElement ? root : null
  }

  const focusEditor = async () => {
    await nextTick()

    if (editMode.value === 'markdown') {
      markdownInput.value?.focus()
      const len = markdownInput.value?.value.length ?? 0
      markdownInput.value?.setSelectionRange(len, len)
      return
    }

    if (! editInput.value) return
    editInput.value.innerHTML = renderedEditContent.value
    editInput.value.focus()
  }

  const startEdit = async () => {
    isEditing.value = true
    editContent.value = options.sourceContent.value
    editMode.value = options.defaultMarkdownMode.value ? 'markdown' : 'wysiwyg'
    await focusEditor()
  }

  const handleEditInput = () => {
    if (! editInput.value) return
    editContent.value = turndownService.turndown(editInput.value.innerHTML)
  }

  const saveEdit = () => {
    if (editMode.value === 'wysiwyg' && editInput.value) {
      editContent.value = turndownService.turndown(editInput.value.innerHTML)
    }
    options.onSave(editContent.value)
  }

  const saveAndExitEdit = () => {
    saveEdit()
    isEditing.value = false
  }

  const discardEdit = () => {
    isEditing.value = false
    editContent.value = options.sourceContent.value
  }

  const handleEditorBlur = (event: FocusEvent) => {
    if (! options.autoSubmitOnBlur.value || ! isEditing.value) return

    const currentTarget = event.currentTarget as HTMLElement | null
    const editorRoot = currentTarget?.closest('[data-editor-root]')
    const nextTarget = event.relatedTarget as Node | null

    if (editorRoot && nextTarget && editorRoot.contains(nextTarget)) {
      return
    }

    saveAndExitEdit()
  }

  const toggleEditMode = async () => {
    if (editMode.value === 'wysiwyg') {
      handleEditInput()
      editMode.value = 'markdown'
      await focusEditor()
      return
    }

    editMode.value = 'wysiwyg'
    await focusEditor()
  }

  watch(
    () => options.sourceContent.value,
    value => {
      if (! isEditing.value) {
        editContent.value = value
      }
    }
  )

  return {
    isEditing,
    editMode,
    editContent,
    renderedContent,
    setEditInputRef,
    setMarkdownInputRef,
    startEdit,
    handleEditInput,
    saveAndExitEdit,
    discardEdit,
    handleEditorBlur,
    toggleEditMode
  }
}
