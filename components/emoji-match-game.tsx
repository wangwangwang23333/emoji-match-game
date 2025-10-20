"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Sparkles,
  RotateCcw,
  Trash2,
  Shuffle,
  Volume2,
  VolumeX,
  BookOpen,
  X,
  HelpCircle,
  Play,
  Clock,
  Trophy,
} from "lucide-react"

// Allow any emoji string for flexibility — avoids hardcoding a union of many emoji
type FriendEmoji = string

interface Friend {
  emoji: FriendEmoji
  name: string
  nickname: string
  description: string
  letter: string
}

interface GameCard {
  id: string
  friend: Friend
  layer: number
  position: { x: number; y: number }
  isBlocked: boolean
  isRemoved: boolean
}

const FRIENDS: Friend[] = [
  { emoji: "🤣", name: "汪明杰", nickname: "追逐", description: "爱打游戏的挚友", letter: "S" },
  { emoji: "🏃", name: "梁乔", nickname: "Joe", description: "热爱运动的伙伴", letter: "T" },
  { emoji: "🤡", name: "方必诚", nickname: "暴克尔", description: "温柔善良的闺蜜", letter: "A" },
  { emoji: "🐱", name: "郭蓥蓥", nickname: "莹莹莹", description: "幽默风趣的损友", letter: "R" },
  { emoji: "😋", name: "香宁雨", nickname: "禾川", description: "才华横溢的学霸", letter: "P" },
  { emoji: "☁️", name: "赵敏", nickname: "浓云", description: "热心肠的好兄弟", letter: "A" },
  { emoji: "💿", name: "陈垲昕", nickname: "一壤", description: "活泼开朗的开心果", letter: "R" },
  { emoji: "🏊", name: "程敬", nickname: "Hypocrisy", description: "文艺范的知己", letter: "T" },
  { emoji: "😅", name: "尚丙奇", nickname: "Bingqi", description: "充满正能量的朋友", letter: "Y" },
]

const MORSE_CODE: Record<string, string> = {
  S: "...",
  T: "-",
  A: ".-",
  R: ".-.",
  P: ".--.",
  Y: "-.--",
}

const MAX_SLOT_SIZE = 7
const CARDS_PER_FRIEND = 9 // All friends have 6 cards (2 sets of 3), no special cards

export default function EmojiMatchGame() {
  const [cards, setCards] = useState<GameCard[]>([])
  const [slot, setSlot] = useState<GameCard[]>([])
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing")
  const [powerUps, setPowerUps] = useState({ removeOne: 3, shuffleCards: 3 })
  const [isMuted, setIsMuted] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; emoji: string }>>([])
  const [unlockedFriends, setUnlockedFriends] = useState<Set<string>>(new Set()) // Track by friend name
  const [showUnlockNotification, setShowUnlockNotification] = useState<string | null>(null)
  const [showCollection, setShowCollection] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [timer, setTimer] = useState(0)
  const [score, setScore] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const bgMusicRef = useRef<HTMLAudioElement | null>(null)
  const clickSoundRef = useRef<HTMLAudioElement | null>(null)
  const matchSoundRef = useRef<HTMLAudioElement | null>(null)
  const winSoundRef = useRef<HTMLAudioElement | null>(null)
  const loseSoundRef = useRef<HTMLAudioElement | null>(null)
  const [isBgMusicPlaying, setIsBgMusicPlaying] = useState(false)

  useEffect(() => {
    bgMusicRef.current = createBackgroundMusic()
    clickSoundRef.current = createClickSound()
    matchSoundRef.current = createMatchSound()
    winSoundRef.current = createWinSound()
    loseSoundRef.current = createLoseSound()

    if (bgMusicRef.current && !isMuted) {
      bgMusicRef.current.play().catch(() => {})
    }

    return () => {
      bgMusicRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted
    }
  }, [isMuted])

  const createBackgroundMusic = () => {
    const audio = new Audio()
    audio.loop = true
    audio.volume = 0.3
    audio.src = ""
    audio.muted = false
    return audio
  }

  const createClickSound = () => {
    const audio = new Audio()
    audio.volume = 0.4
    audio.src = "https://baokker-oss-blog-hangzhou.oss-cn-hangzhou.aliyuncs.com/temp/bo.MP3"
    return audio
  }

  const createMatchSound = () => {
    const audio = new Audio()
    audio.volume = 0.5
    audio.src = "https://baokker-oss-blog-hangzhou.oss-cn-hangzhou.aliyuncs.com/temp/du.MP3"
    return audio
  }

  const createWinSound = () => {
    const audio = new Audio()
    audio.volume = 0.6
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    return audio
  }

  const createLoseSound = () => {
    const audio = new Audio()
    audio.volume = 0.5
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    return audio
  }

  const playSound = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }

  const createParticles = (x: number, y: number, emoji: string) => {
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: `particle-${Date.now()}-${i}`,
      x,
      y,
      emoji,
    }))
    setParticles((prev) => [...prev, ...newParticles])

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)))
    }, 1000)
  }

  useEffect(() => {
    initializeGame()
  }, [])

  const updateBlockedStatus = (currentCards: GameCard[]) => {
    return currentCards.map((card) => {
      if (card.isRemoved) return card

      const isBlocked = currentCards.some((otherCard) => {
        if (otherCard.isRemoved || otherCard.id === card.id) return false
        if (otherCard.layer <= card.layer) return false

        const xOverlap = Math.abs(card.position.x - otherCard.position.x) < 60
        const yOverlap = Math.abs(card.position.y - otherCard.position.y) < 60

        return xOverlap && yOverlap
      })

      return { ...card, isBlocked }
    })
  }

  const initializeGame = () => {
    const newCards: GameCard[] = []
    let idCounter = 0

    FRIENDS.forEach((friend) => {
      for (let i = 0; i < CARDS_PER_FRIEND; i++) {
        const layer = Math.floor(Math.random() * 3)
        const x = Math.random() * 350 + 25
        const y = Math.random() * 350 + 25

        newCards.push({
          id: `card-${idCounter++}`,
          friend,
          layer,
          position: { x, y },
          isBlocked: false,
          isRemoved: false,
        })
      }
    })

    setCards(updateBlockedStatus(newCards))
    setSlot([])
    setGameStatus("playing")
    setPowerUps({ removeOne: 2, shuffleCards: 2 })
    setUnlockedFriends(new Set())
    setTimer(0)
    setScore(0)
  }

  const handleCardClick = (clickedCard: GameCard) => {
    if (clickedCard.isBlocked || clickedCard.isRemoved) return
    if (gameStatus !== "playing") return
    if (slot.length >= MAX_SLOT_SIZE) return

    playSound(clickSoundRef)

    const newSlot = [...slot, clickedCard]
    setSlot(newSlot)

    const updatedCards = cards.map((card) => (card.id === clickedCard.id ? { ...card, isRemoved: true } : card))
    setCards(updateBlockedStatus(updatedCards))

    checkForMatches(newSlot, updatedCards)
  }

  const checkForMatches = (currentSlot: GameCard[], currentCards: GameCard[]) => {
    const friendCount: { [key: string]: GameCard[] } = {}

    currentSlot.forEach((card) => {
      const friendName = card.friend.name
      if (!friendCount[friendName]) {
        friendCount[friendName] = []
      }
      friendCount[friendName].push(card)
    })

    let newSlot = [...currentSlot]
    let hasMatch = false
    Object.entries(friendCount).forEach(([friendName, cards]) => {
      if (cards.length >= 3) {
        hasMatch = true
        const toRemove = cards.slice(0, 3)
        newSlot = newSlot.filter((card) => !toRemove.includes(card))

        playSound(matchSoundRef)
        createParticles(window.innerWidth / 2, window.innerHeight - 200, cards[0].friend.emoji)
        setScore((prev) => prev + 100)
      }
    })

    setSlot(newSlot)

    if (hasMatch) {
      checkFriendElimination(currentCards)
    }

    setTimeout(() => {
      checkGameStatus(newSlot, currentCards)
    }, 300)
  }

  const checkFriendElimination = (currentCards: GameCard[]) => {
    FRIENDS.forEach((friend) => {
      if (!unlockedFriends.has(friend.name)) {
        const remainingCards = currentCards.filter((card) => card.friend.name === friend.name && !card.isRemoved)

        if (remainingCards.length === 0) {
          setUnlockedFriends((prev) => new Set([...prev, friend.name]))
          setShowUnlockNotification(friend.name)
          setTimeout(() => setShowUnlockNotification(null), 2000)
        }
      }
    })
  }

  const checkGameStatus = (currentSlot: GameCard[], currentCards: GameCard[]) => {
    if (currentSlot.length >= MAX_SLOT_SIZE) {
      setGameStatus("lost")
      playSound(loseSoundRef)
      return
    }

    const remainingCards = currentCards.filter((card) => !card.isRemoved)
    if (remainingCards.length === 0 && currentSlot.length === 0) {
      setGameStatus("won")
      playSound(winSoundRef)
      createParticles(window.innerWidth / 2, window.innerHeight / 2, "🎉")
    }
  }

  const removeOne = () => {
    if (powerUps.removeOne <= 0 || slot.length === 0) return

    playSound(clickSoundRef)

    const newSlot = slot.slice(0, -1)
    setSlot(newSlot)
    setPowerUps({ ...powerUps, removeOne: powerUps.removeOne - 1 })
  }

  const shuffleCards = () => {
    if (powerUps.shuffleCards <= 0) return

    playSound(clickSoundRef)

    const shuffledCards = cards.map((card) => {
      if (card.isRemoved) return card

      return {
        ...card,
        position: {
          x: Math.random() * 350 + 25,
          y: Math.random() * 350 + 25,
        },
        layer: Math.floor(Math.random() * 3),
      }
    })

    setCards(updateBlockedStatus(shuffledCards))
    setPowerUps({ ...powerUps, shuffleCards: powerUps.shuffleCards - 1 })
  }

  const renderMorseCode = (letter: string, emoji: string) => {
    const morse = MORSE_CODE[letter] || ""
    return (
      <div className="flex gap-5 justify-center mt-2">
        {" "}
        {/* 间距增大到3px，足够分隔 */}
        {morse.split("").map((symbol, index) => (
          <span
            key={index}
            className="flex items-center justify-center h-6"
            style={{
              width: symbol === "-" ? "14px" : "7px",
              transform: symbol === "-" ? "scaleX(2)" : "none",
              transformOrigin: "center center", // 中心拉伸，左右对称扩展
              padding: "0 1px",
              boxSizing: "border-box", // 确保padding不影响整体宽度计算
            }}
            aria-label={symbol === "." ? "dot" : "dash"}
          >
            {emoji}
          </span>
        ))}
      </div>
    )
  }

  const [bgMusicPlayed, setBgMusicPlayed] = useState(false)

  const playBackgroundMusic = () => {
    if (!bgMusicPlayed) {
      // 确保只播放一次
      const audio = new Audio()
      audio.loop = true
      audio.volume = 0.3
      audio.src = "https://baokker-oss-blog-hangzhou.oss-cn-hangzhou.aliyuncs.com/temp/music.MP3"
      audio.play().catch((err) => console.log("播放失败:", err))
      setBgMusicPlayed(true) // 标记为已播放，防止重复点击
    }
  }

  useEffect(() => {
    if (gameStatus === "playing") {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameStatus])

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
        <Button onClick={() => setShowCollection(true)} size="lg" className="gap-2 shadow-xl" variant="default">
          <BookOpen className="w-5 h-5" />
          朋友图鉴 ({unlockedFriends.size}/9)
        </Button>

        <Button onClick={() => setShowHelpModal(true)} variant="outline" size="lg" className="gap-2">
          <HelpCircle className="w-5 h-5" />
          求救
        </Button>

        <Button onClick={playBackgroundMusic} size="lg" variant="outline" disabled={bgMusicPlayed}>
          <Play className="w-5 h-5" />
          播放音乐
        </Button>
      </div>

      {showCollection && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-99999 p-4">
          <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                朋友图鉴
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCollection(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {FRIENDS.map((friend) => {
                const isUnlocked = unlockedFriends.has(friend.name)

                return (
                  <div
                    key={friend.name}
                    className={`relative p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                      isUnlocked
                        ? "bg-card border-primary shadow-md"
                        : "bg-muted/50 border-muted-foreground/20 backdrop-blur-sm"
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <div className="text-5xl mb-2">{friend.emoji}</div>
                        <div className="text-sm font-bold text-center mb-1">{friend.name}</div>
                        {renderMorseCode(friend.letter, friend.emoji)}
                      </>
                    ) : (
                      <>
                        <div className="text-5xl opacity-20 blur-sm mb-2">{friend.emoji}</div>
                        <div className="text-sm text-muted-foreground/50 blur-sm mb-1">{friend.nickname}・未解锁</div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-4xl text-muted-foreground/50">?</div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">集齐全部图鉴，解锁神秘惊喜</p>
            </div>
          </Card>
        </div>
      )}

      {showUnlockNotification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
          <Card className="p-4 bg-primary text-primary-foreground shadow-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">图鉴碎片 +1</span>
            </div>
            <p className="text-sm mt-1">解锁了 {showUnlockNotification}！</p>
          </Card>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-50">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute text-4xl animate-ping"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) forwards",
            }}
          >
            {particle.emoji}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-4xl md:text-5xl font-bold text-primary flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            朋友消消乐
            <Sparkles className="w-8 h-8" />
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="ml-2">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>
        <p className="text-muted-foreground text-lg">点击朋友卡片，凑齐3个相同的即可消除！他们是谁呢？</p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="w-5 h-5 text-primary" />
            <span>
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="w-5 h-5 text-primary" />
            <span>{score}</span>
          </div>
        </div>
      </div>

      <Card className="p-6 mb-6 bg-card shadow-lg">
        <div className="relative h-[500px] bg-muted/30 rounded-lg overflow-hidden border-2 border-border">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              disabled={card.isBlocked || card.isRemoved}
              className={`absolute transition-all duration-200 ${
                card.isRemoved ? "opacity-0 scale-0" : "opacity-100 scale-100"
              } ${
                card.isBlocked ? "cursor-not-allowed" : "cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95"
              }`}
              style={{
                left: `${card.position.x}px`,
                top: `${card.position.y}px`,
                zIndex: card.layer,
              }}
            >
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-4xl md:text-5xl bg-card border-2 shadow-md relative ${
                  card.isBlocked ? "border-muted-foreground/30" : "border-border"
                }`}
              >
                {card.friend.emoji}
                {/* Dark overlay for blocked cards */}
                {card.isBlocked && <div className="absolute inset-0 bg-black/40 rounded-xl backdrop-blur-[1px]" />}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 mb-6 bg-accent/20 border-2 border-accent">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-accent-foreground">临时卡槽</h2>
          <span className="text-sm font-medium text-muted-foreground">
            {slot.length} / {MAX_SLOT_SIZE}
          </span>
        </div>
        <div className="flex gap-2 min-h-[80px] items-center justify-center">
          {Array.from({ length: MAX_SLOT_SIZE }).map((_, index) => {
            const card = slot[index]
            return (
              <div
                key={index}
                className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-4xl md:text-5xl transition-all duration-200 ${
                  card
                    ? "bg-card border-2 border-border shadow-md animate-in zoom-in"
                    : "border-2 border-dashed border-muted-foreground/30 bg-muted/20"
                }`}
              >
                {card ? card.friend.emoji : ""}
              </div>
            )
          })}
        </div>
      </Card>

      {showHelpModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <Card className="w-full max-w-md p-6 relative">
            <Button
              onClick={() => setShowHelpModal(false)}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-1"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                寻求<b>帮助</b>？别急，老鼠们来帮你
              </p>
              <div className="flex gap-2 items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <img
                    key={`s-${i}`}
                    src="/images/design-mode/mouse2(2).png"
                    alt="dot"
                    className="w-6 h-6 object-contain"
                  />
                ))}
                <div className="w-2"></div>
                {[1, 2, 3].map((i) => (
                  <img
                    key={`o-${i}`}
                    src="/images/design-mode/mouse3(1).png"
                    alt="dash"
                    className="w-12 h-6 object-contain"
                  />
                ))}
                <div className="w-2"></div>
                {[1, 2, 3].map((i) => (
                  <img
                    key={`s2-${i}`}
                    src="/images/design-mode/mouse2(2).png"
                    alt="dot"
                    className="w-6 h-6 object-contain"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  removeOne()
                  setShowHelpModal(false)
                }}
                disabled={powerUps.removeOne <= 0 || slot.length === 0}
                variant="outline"
                size="lg"
                className="gap-2 justify-start"
              >
                <Trash2 className="w-5 h-5" />
                偷走一张 ({powerUps.removeOne})
              </Button>
              <Button
                onClick={() => {
                  shuffleCards()
                  setShowHelpModal(false)
                }}
                disabled={powerUps.shuffleCards <= 0}
                variant="outline"
                size="lg"
                className="gap-2 justify-start"
              >
                <Shuffle className="w-5 h-5" />
                打乱卡牌 ({powerUps.shuffleCards})
              </Button>
              <Button
                onClick={() => {
                  initializeGame()
                  setShowHelpModal(false)
                }}
                variant="default"
                size="lg"
                className="gap-2 justify-start"
              >
                <RotateCcw className="w-5 h-5" />
                重新开始
              </Button>
            </div>
          </Card>
        </div>
      )}

      {gameStatus === "won" && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8 max-w-md text-center shadow-2xl animate-in zoom-in duration-300 relative">
            <Button
              onClick={() => setGameStatus("playing")}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-primary mb-4">恭喜通关！</h2>
            <p className="text-lg text-muted-foreground mb-2">你成功消除了所有朋友卡片！</p>
            <p className="text-xl mb-2">
              用时: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
            </p>
            <p className="text-xl mb-4">得分: {score}</p>
            <p className="text-xl mb-6">朋友图鉴已100%解锁！</p>
            <div className="flex flex-col gap-2">
              <Button onClick={initializeGame} size="lg" className="w-full">
                再玩一次
              </Button>
              <Button onClick={() => setShowCollection(true)} variant="outline" size="lg" className="w-full gap-2">
                <BookOpen className="w-5 h-5" />
                查看朋友图鉴
              </Button>
            </div>
          </Card>
        </div>
      )}

      {gameStatus === "lost" && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8 max-w-md text-center shadow-2xl animate-in zoom-in duration-300 relative">
            <Button
              onClick={() => setGameStatus("playing")}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="text-6xl mb-4 animate-pulse">😢</div>
            <h2 className="text-3xl font-bold text-destructive mb-4">游戏失败</h2>
            <p className="text-lg text-muted-foreground mb-2">卡槽满了！试试使用道具或重新开始吧</p>
            <p className="text-lg mb-6">得分: {score}</p>
            <Button onClick={initializeGame} size="lg" className="w-full">
              重新开始
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
