import './styles.css';
import { createSignal, createEffect, For, onMount } from 'solid-js'
import { sendMessageQuery, isStreamAvailableQuery, IncomingInput } from '@/queries/sendMessageQuery'
import { TextInput } from './inputs/textInput'
import { GuestBubble } from './bubbles/GuestBubble'
import { BotBubble } from './bubbles/BotBubble'
import { LoadingBubble } from './bubbles/LoadingBubble'
import { SourceBubble } from './bubbles/SourceBubble'
import { BotMessageTheme, TextInputTheme, UserMessageTheme } from '@/features/bubble/types'
import { Badge } from './Badge'
import socketIOClient from 'socket.io-client'
import { Popup } from '@/features/popup'

type messageType = 'apiMessage' | 'userMessage' | 'usermessagewaiting'

export type MessageType = {
    message: string
    type: messageType,
    sourceDocuments?: any
}

export type ChatflowConfig = {
    predefinedQuestions?: string[];
    [key: string]: any;
}

export type BotProps = {
    chatflowid: string
    apiHost?: string
    chatflowConfig?: Record<string, unknown>
    welcomeMessage?: string
    botMessage?: BotMessageTheme
    userMessage?: UserMessageTheme
    textInput?: TextInputTheme
    poweredByTextColor?: string
    badgeBackgroundColor?: string
    fontSize?: number
}

const defaultWelcomeMessage = 'Hello. How can we help you?'

export const Bot = (props: BotProps & { class?: string }) => {
    let chatContainer: HTMLDivElement | undefined
    let bottomSpacer: HTMLDivElement | undefined
    let botContainer: HTMLDivElement | undefined

    const [userInput, setUserInput] = createSignal('')
    const [loading, setLoading] = createSignal(false)
    const [sourcePopupOpen, setSourcePopupOpen] = createSignal(false)
    const [sourcePopupSrc, setSourcePopupSrc] = createSignal({})
    const [messages, setMessages] = createSignal<MessageType[]>([
        {
            message: props.welcomeMessage ?? defaultWelcomeMessage,
            type: 'apiMessage'
        },
    ], { equals: false })
    const [socketIOClientId, setSocketIOClientId] = createSignal('')
    const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = createSignal(false)
    const [email, setEmail] = createSignal('')
    const [name, setName] = createSignal('')
    const [hasSentFirstMessage, setHasSentFirstMessage] = createSignal(false);

    onMount(() => {
        if (!bottomSpacer) return
        setTimeout(() => {
            chatContainer?.scrollTo(0, chatContainer.scrollHeight)
        }, 50)
    })

    const scrollToBottom = () => {
        setTimeout(() => {
            chatContainer?.scrollTo(0, chatContainer.scrollHeight)
        }, 50)
    }

    const updateLastMessage = (text: string) => {
        setMessages(data => {
            const updated = data.map((item, i) => {
                if (i === data.length - 1) {
                    return {...item, message: item.message + text };
                }
                return item;
            });
            return [...updated];
        });
    }

    const updateLastMessageSourceDocuments = (sourceDocuments: any) => {
        setMessages(data => {
            const updated = data.map((item, i) => {
                if (i === data.length - 1) {
                    return {...item, sourceDocuments: sourceDocuments };
                }
                return item;
            });
            return [...updated];
        });
    }

    // Handle errors
    const handleError = (message = 'Oops! There seems to be an error. Please try again.') => {
        setMessages((prevMessages) => [...prevMessages, { message, type: 'apiMessage' }])
        setLoading(false)
        setUserInput('')
        scrollToBottom()
    }

    // Handle form submission
    const handleSubmit = async (value: string) => {
        setUserInput(value)

        if (!hasSentFirstMessage()) {
            setHasSentFirstMessage(true);
            setEmail(value);
            setName(value);

            setMessages((prevMessages) => [
                ...prevMessages,
                { message: 'Welcome! Please provide your email and name.', type: 'apiMessage' },
            ]);

            setUserInput('');
            scrollToBottom();
            
            return;
        }

        setLoading(true)
        setMessages((prevMessages) => [...prevMessages, { message: value, type: 'userMessage' }])
        scrollToBottom()

        // Send user question and history to API
        const body: IncomingInput = {
            question: value,
            history: messages().filter((msg) => msg.message !== props.welcomeMessage ?? defaultWelcomeMessage)
        }

        if (props.chatflowConfig) body.overrideConfig = props.chatflowConfig

        if (isChatFlowAvailableToStream()) body.socketIOClientId = socketIOClientId()

        const { data, error } = await sendMessageQuery({
            chatflowid: props.chatflowid,
            apiHost: props.apiHost,
            body
        })

        if (data) {
            if (typeof data === 'object' && data.text && data.sourceDocuments) {
                if (!isChatFlowAvailableToStream()) {
                    setMessages((prevMessages) => [
                        ...prevMessages,
                        { message: data.text, sourceDocuments: data.sourceDocuments, type: 'apiMessage' }
                    ])
                }
            } else {
                if (!isChatFlowAvailableToStream()) setMessages((prevMessages) => [...prevMessages, { message: data, type: 'apiMessage' }])
            }
            setLoading(false)
            setUserInput('')
            scrollToBottom()
        }
        if (error) {
            console.error(error)
            const err: any = error
            const errorData = err.response.data || `${err.response.status}: ${err.response.statusText}`
            handleError(errorData)
            return
        }
    }

    // Auto scroll chat to bottom
    createEffect(() => {
        if (messages()) scrollToBottom()
    })

    createEffect(() => {
        if (props.fontSize && botContainer) botContainer.style.fontSize = `${props.fontSize}px`
    })

    createEffect(async() => {
        const { data } = await isStreamAvailableQuery({
            chatflowid: props.chatflowid,
            apiHost: props.apiHost,
        })

        if (data) {
            setIsChatFlowAvailableToStream(data?.isStreaming ?? false)
        }

        const socket = socketIOClient(props.apiHost as string)

        socket.on('connect', () => {
            setSocketIOClientId(socket.id)
        })

        socket.on('start', () => {
            setMessages((prevMessages) => [...prevMessages, { message: '', type: 'apiMessage' }])
        })

        socket.on('sourceDocuments', updateLastMessageSourceDocuments)

        socket.on('token', updateLastMessage)

        return () => {
            setUserInput('')
            setLoading(false)
            setMessages([
                {
                    message: props.welcomeMessage ?? defaultWelcomeMessage,
                    type: 'apiMessage'
                }
            ])
            if (socket) {
                socket.disconnect()
                setSocketIOClientId('')
            }
        }
    })

    const predefinedQuestions = props.chatflowConfig?.predefinedQuestions;

    const handlePredefinedQuestionClick = (question: string) => {
        handleSubmit(question);
    }

    return (
        <>
            {!hasSentFirstMessage() && (
                <div class="flex justify-center items-center h-full">
                    <div class="max-w-sm bg-white border border-gray-300 p-4 shadow rounded">
                        <div class="mb-4">
                            <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
                                Email
                            </label>
                            <input
                                class="w-full px-3 py-2 border border-gray-300 rounded"
                                type="email"
                                id="email"
                                value={userInput()}
                                onChange={(e) => setUserInput(e.target.value)}
                            />
                        </div>
                        <div class="mb-4">
                            <label class="block text-gray-700 text-sm font-bold mb-2" for="name">
                                Name
                            </label>
                            <input
                                class="w-full px-3 py-2 border border-gray-300 rounded"
                                type="text"
                                id="name"
                                value={userInput()}
                                onChange={(e) => setUserInput(e.target.value)}
                            />
                        </div>
                        <button
                            class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            type="submit"
                            onClick={() => handleSubmit(userInput())}
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}

            {hasSentFirstMessage() && (
                <div ref={botContainer} class={'relative flex w-full h-full text-base overflow-hidden bg-cover bg-center flex-col items-center chatbot-container ' + props.class}>
                    <div class="flex w-full h-full justify-center">
                        <div style={{ "padding-bottom": '100px' }} ref={chatContainer} class="overflow-y-scroll min-w-full w-full min-h-full px-3 pt-10 relative scrollable-container chatbot-chat-view scroll-smooth">
                            <For each={[...messages()]}>
                                {(message, index) => (
                                    <>
                                        {message.type === 'userMessage' && (
                                            <GuestBubble
                                                message={message.message}
                                                backgroundColor={props.userMessage?.backgroundColor}
                                                textColor={props.userMessage?.textColor}
                                                showAvatar={props.userMessage?.showAvatar}
                                                avatarSrc={props.userMessage?.avatarSrc}
                                            />
                                        )}
                                        {message.type === 'apiMessage' && (
                                            <BotBubble
                                                message={message.message}
                                                backgroundColor={props.botMessage?.backgroundColor}
                                                textColor={props.botMessage?.textColor}
                                                showAvatar={props.botMessage?.showAvatar}
                                                avatarSrc={props.botMessage?.avatarSrc}
                                            />
                                        )}
                                        {message.type === 'userMessage' && loading() && index() === messages().length - 1 && (
                                            <LoadingBubble />
                                        )}
                                        {message.sourceDocuments && message.sourceDocuments.length &&
                                            <div style={{ display: 'flex', "flex-direction": 'row', width: '100%' }}>
                                                <For each={[...message.sourceDocuments]}>
                                                    {(src) => (
                                                        <SourceBubble
                                                            pageContent={src.pageContent}
                                                            metadata={src.metadata}
                                                            onSourceClick={() => {
                                                                setSourcePopupSrc(src);
                                                                setSourcePopupOpen(true);
                                                            }}
                                                        />
                                                    )}
                                                </For>
                                            </div>}
                                    </>
                                )}
                            </For>
                            <div class="flex justify-start mb-2 overflow-x-auto whitespace-nowrap">
                                {predefinedQuestions.map((question) => (
                                    <button 
                                        class="m-1 p-2 border rounded hover:bg-gray-200"
                                        onClick={() => handlePredefinedQuestionClick(question)}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <TextInput
                            backgroundColor={props.textInput?.backgroundColor}
                            textColor={props.textInput?.textColor}
                            placeholder={props.textInput?.placeholder}
                            sendButtonColor={props.textInput?.sendButtonColor}
                            fontSize={props.fontSize}
                            defaultValue={userInput()}
                            onSubmit={handleSubmit}
                        />
                    </div>
                    <Badge badgeBackgroundColor={props.badgeBackgroundColor} poweredByTextColor={props.poweredByTextColor} botContainer={botContainer} />
                    <BottomSpacer ref={bottomSpacer} />
                </div>
                {sourcePopupOpen() && <Popup isOpen={sourcePopupOpen()} value={sourcePopupSrc()} onClose={() => setSourcePopupOpen(false)} />}
            </>
        )
}

type BottomSpacerProps = {
    ref: HTMLDivElement | undefined
}

const BottomSpacer = (props: BottomSpacerProps) => {
    return <div ref={props.ref} class="w-full h-32" />
}
