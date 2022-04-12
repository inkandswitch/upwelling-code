import { DraftMetadata } from 'api'

// only get the drafts you can see:
// - your private drafts
// - shared drafts
export function getYourDrafts(
  drafts: DraftMetadata[],
  rootId: string,
  yourId: string
) {
  return drafts.filter((l) => {
    // don't show root draft
    if (l.id === rootId) {
      return false
    }
    // don't show if it's someone elses' and not shared
    if (l.authorId !== yourId && !l.shared) {
      return false
    }

    return true
  })
}

// use consistent opacity for highlighting and background uses of author colors.
// returns in the format #FFFFFFNN where NN is % of opacity
export function getAuthorHighlight(hexColor: string): string {
  return hexColor + '40'
}
