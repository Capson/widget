import { onCleanup, onMount } from 'solid-js'

type Props = {
  botContainer: HTMLDivElement | undefined
  poweredByTextColor?: string
  badgeBackgroundColor?: string
}

const defaultTextColor = '#303235'
const imageUrl = 'https://i.ibb.co/HDpVRwT/ddd.png' // replace with your image URL

export const Badge = (props: Props) => {
  let liteBadge: HTMLAnchorElement | undefined
  let observer: MutationObserver | undefined

  const appendBadgeIfNecessary = (mutations: MutationRecord[]) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((removedNode) => {
        if (
          'id' in removedNode &&
          liteBadge &&
          removedNode.id === 'lite-badge'
        ) {
          console.log("Sorry, you can't remove the brand 😅")
          props.botContainer?.append(liteBadge)
        }
      })
    })
  }

  onMount(() => {
    if (!document || !props.botContainer) return
    observer = new MutationObserver(appendBadgeIfNecessary)
    observer.observe(props.botContainer, {
      subtree: false,
      childList: true,
    })

    // Image element creation and insertion into DOM.
    const imageElement = document.createElement('img')
    imageElement.src = imageUrl
    imageElement.alt = "Top Image"
    
    if (props.botContainer.firstChild){
       props.botContainer.insertBefore(imageElement, props.botContainer.firstChild);
     } else{
       props.botContainer.appendChild(imageElement)
     }
     
   })

   onCleanup(() => {
     if (observer) observer.disconnect()
   })

   return (
     <span style={{
       fontSize:'13px',
       position:'absolute',
       bottom:0,
       padding:'10px',
       margin:'auto',
       width:'100%',
       textAlign:'center',
       color: props.poweredByTextColor ?? defaultTextColor,
       backgroundColor: props.badgeBackgroundColor ?? '#ffffff'
     }}>
     Powered by 
     <a
        ref={liteBadge}
        href={'https://cloozo.com'}
        target="_blank"
        rel="noopener noreferrer"
        className="lite-badge"
        id="lite-badge"
        style={{ fontWeight:'bold', color: props.poweredByTextColor ?? defaultTextColor }}
        
     >
         <span> Cloozo</span>
     </a>
   </span>
 )
}