import { motion } from 'framer-motion'

export default function ProgressBar({ progress }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] bg-gray-100 z-50">
      <motion.div
        className="h-full bg-accent rounded-r-full"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  )
}
