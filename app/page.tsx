'use client'

import { useRouter } from 'next/navigation'
import { Button, Card, Space, Typography } from 'antd'
import styles from './Home.module.css'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className={styles.page}>

      <main className={styles.main}>
        <div className={styles.hero}>
          <Typography.Title className={styles.heroTitle}>
            Платформа для роботи з робочими просторами, папками та нотатками
          </Typography.Title>

          <Typography.Paragraph className={styles.heroText}>
            Цей застосунок створений як веб-орієнтована платформа для зручного керування задачами та нотатками
            у форматі Markdown. Ідея натхненна підходом Notion: один робочий простір містить директорії, а в них — нотатки.
          </Typography.Paragraph>

          <Space size="middle" className={styles.heroActions}>
            <Button type="primary" size="large" onClick={() => router.push('/auth/login')}>
              Почати роботу
            </Button>
            <Button size="large" onClick={() => router.push('/auth/register')}>
              Створити акаунт
            </Button>
          </Space>
        </div>

        <div className={styles.grid}>
          <Card className={styles.card} variant="borderless">
            <Typography.Title level={5} className={styles.cardTitle}>
              Workspaces
            </Typography.Title>
            <Typography.Paragraph className={styles.cardText}>
              Окремі робочі простори для різних проєктів: навчання, особисті плани, завдання команди.
            </Typography.Paragraph>
          </Card>

          <Card className={styles.card} variant="borderless">
            <Typography.Title level={5} className={styles.cardTitle}>
              Папки та структура
            </Typography.Title>
            <Typography.Paragraph className={styles.cardText}>
              Ієрархія “папки → нотатки”. Нотатки без папки живуть на рівні кореня робочого простору.
            </Typography.Paragraph>
          </Card>

          <Card className={styles.card} variant="borderless">
            <Typography.Title level={5} className={styles.cardTitle}>
              Markdown-редактор
            </Typography.Title>
            <Typography.Paragraph className={styles.cardText}>
              Редагування у Markdown + прев’ю. Контент нотаток зберігається локально (LocalStorage) тільки для нотаток.
            </Typography.Paragraph>
          </Card>

          <Card className={styles.card} variant="borderless">
            <Typography.Title level={5} className={styles.cardTitle}>
              Сміття
            </Typography.Title>
            <Typography.Paragraph className={styles.cardText}>
              Відновлення або остаточне видалення видалених просторів, папок і нотаток.
            </Typography.Paragraph>
          </Card>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Typography.Text type="secondary">
            Виконав: Давидеску Даніел
          </Typography.Text>
          <Typography.Text type="secondary">
            © {new Date().getFullYear()} X-Notes. Всі права захищені.
          </Typography.Text>
        </div>
      </footer>
    </div>
  )
}
