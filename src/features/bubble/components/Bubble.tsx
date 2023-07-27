import { createSignal, Show, splitProps, onMount } from 'solid-js'
import styles from '../../../assets/index.css'
import { BubbleButton } from './BubbleButton'
import { BubbleParams } from '../types'
import { Bot, BotProps } from '../../../components/Bot'

export type BubbleProps = BotProps & BubbleParams

export const Bubble = (props: BubbleProps) => {


    const [bubbleProps] = splitProps(props, ['theme'])

    const [isBotOpened, setIsBotOpened] = createSignal(false)
    const [isBotStarted, setIsBotStarted] = createSignal(false)

    const openBot = () => {
        if (!isBotStarted()) setIsBotStarted(true)
        setIsBotOpened(true)
    }

    const closeBot = () => {
        setIsBotOpened(false)
    }
    const [isMessageVisible, setIsMessageVisible] = createSignal(true)

    const [isButtonClicked, setIsButtonClicked] = createSignal(false)
    const [buttonPosition, setButtonPosition] = createSignal({bottom: '110px', right: '50px'})

    const toggleBot = () => {
        setIsButtonClicked(true)
        isBotOpened() ? closeBot() : openBot()
    }

    const removeMessage = () => {
        setIsMessageVisible(false)
    }

    onMount(() => {
        const button = document.querySelector('button[part="button"]');
        if(button) {
            const { bottom, right } = button.getBoundingClientRect();
            setButtonPosition({bottom: `${window.innerHeight - bottom + 400}px`, right: `${right}px`});
        }
    });

    return (
        <>
            <style>{styles}</style>
            <Show when={!isButtonClicked() && isMessageVisible()}>
                <div 
                    class="fixed flex items-center justify-between bg-white border-gray-300 border-2 rounded p-2"
                    style={{...buttonPosition(), borderColor: '#D1D5DB', borderWidth: '1px'}}
                >
                    Hello, welcome to Cloozo 👋. How can we assist you today 😃
                    <svg onClick={removeMessage} class="h-6 w-6 ml-2 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="https://img.icons8.com/material-outlined/24/cancel--v1.png" style={{position: 'absolute', right: '-30px'}}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
            </Show>
            <BubbleButton {...bubbleProps.theme?.button} toggleBot={toggleBot} isBotOpened={isBotOpened()} 
            
            />
            <div
                part='bot'
                style={{
                    height: bubbleProps.theme?.chatWindow?.height ? `${bubbleProps.theme?.chatWindow?.height.toString()}px` : 'calc(100% - 100px)',
                    transition: 'transform 200ms cubic-bezier(0, 1.2, 1, 1), opacity 150ms ease-out',
                    'transform-origin': 'bottom right',
                    transform: isBotOpened() ? 'scale3d(1, 1, 1)' : 'scale3d(0, 0, 1)',
                    'box-shadow': 'rgb(0 0 0 / 16%) 0px 5px 40px',
                    'background-color': bubbleProps.theme?.chatWindow?.backgroundColor || '#ffffff',
                    'z-index': 42424242
                }}
                class={
                    `fixed sm:right-5 rounded-lg w-full sm:w-[400px] max-h-[704px]` +
                    (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none') +
                    (props.theme?.button?.size === 'large' ? ' bottom-24' : ' bottom-20')
                }
            >
                <Show when={isBotStarted()}>
                    <Bot
                        badgeBackgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
                        welcomeMessage={bubbleProps.theme?.chatWindow?.welcomeMessage}
                        poweredByTextColor={bubbleProps.theme?.chatWindow?.poweredByTextColor}
                        textInput={bubbleProps.theme?.chatWindow?.textInput}
                        botMessage={bubbleProps.theme?.chatWindow?.botMessage}
                        userMessage={bubbleProps.theme?.chatWindow?.userMessage}
                        fontSize={bubbleProps.theme?.chatWindow?.fontSize}
                        chatflowid={props.chatflowid}
                        chatflowConfig={props.chatflowConfig}
                        apiHost={props.apiHost} />
                </Show>
            </div>
        </>
    )
}
