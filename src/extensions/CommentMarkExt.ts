import { Mark } from '@tiptap/core';

export const CommentMarkExt = Mark.create({
  name: 'commentMark',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-mark]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...this.options.HTMLAttributes, 'data-comment-mark': '' }, 0];
  },

  addCommands() {
    return {
      setCommentMark: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleCommentMark: (attributes) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
      unsetCommentMark: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
}); 